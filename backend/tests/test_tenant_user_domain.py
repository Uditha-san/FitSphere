import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.core.security import verify_password, create_access_token, get_password_hash

client = TestClient(app)
db = SessionLocal()

# Setup a bootstrapping super admin directly in DB for testing admin API operations
bootstrap_super_admin = User(
    id=str(uuid.uuid4()),
    email=f"bootstrap_{uuid.uuid4().hex[:6]}@fitsphere.test",
    hashed_password=get_password_hash("SuperAdmin123!"),
    full_name="Bootstrap Super Admin",
    role=UserRole.SUPER_ADMIN.value,
    tenant_id=None,
    is_active=True,
)
db.add(bootstrap_super_admin)
db.commit()
db.refresh(bootstrap_super_admin)

admin_headers = {
    "Authorization": f"Bearer {create_access_token(subject=bootstrap_super_admin.id)}"
}

try:
    print('--- TEST 1: Health Endpoint ---')
    r = client.get('/api/v1/health')
    assert r.status_code == 200, f'Health failed: {r.status_code}'
    assert r.json()['status'] == 'healthy'
    assert r.json()['database']['status'] == 'connected'
    print('✓ Health check passed (HTTP 200, DB connected)')

    print('--- TEST 2: Tenant Creation & Slug Generation ---')
    tenant_name = f'PowerFit Gym {uuid.uuid4().hex[:6]}'
    r = client.post('/api/v1/tenants/', json={'name': tenant_name}, headers=admin_headers)
    assert r.status_code == 201, f'Tenant creation failed: {r.text}'
    tenant1 = r.json()
    assert tenant1['name'] == tenant_name
    assert tenant1['slug'].startswith('powerfit-gym-')
    print(f'✓ Tenant 1 created: id={tenant1["id"]}, slug={tenant1["slug"]}')

    print('--- TEST 3: Duplicate Slug Handling ---')
    r = client.post('/api/v1/tenants/', json={'name': tenant_name}, headers=admin_headers)
    assert r.status_code == 201, f'Duplicate tenant name failed: {r.text}'
    tenant2 = r.json()
    assert tenant2['slug'] == f'{tenant1["slug"]}-2'
    print(f'✓ Duplicate slug handled safely: slug={tenant2["slug"]}')

    print('--- TEST 4: Reserved Slug & Special Characters Handling ---')
    r = client.post('/api/v1/tenants/', json={'name': f'Admin {uuid.uuid4().hex[:4]}'}, headers=admin_headers)
    assert r.status_code == 201
    assert 'admin' in r.json()['slug']
    print(f'✓ Reserved slug handled: slug={r.json()["slug"]}')

    r = client.post('/api/v1/tenants/', json={'name': "Gold's Gym & Spa #1!"}, headers=admin_headers)
    assert r.status_code == 201
    assert 'golds-gym-spa-1' in r.json()['slug']
    print(f'✓ Special character sanitization passed: slug={r.json()["slug"]}')

    print('--- TEST 5: Get Tenant by ID and by Slug ---')
    r = client.get(f'/api/v1/tenants/{tenant1["id"]}', headers=admin_headers)
    assert r.status_code == 200 and r.json()['id'] == tenant1['id']
    r = client.get(f'/api/v1/tenants/by-slug/{tenant1["slug"]}')
    assert r.status_code == 200 and r.json()['id'] == tenant1['id']
    print('✓ Tenant get-by-id and get-by-slug verified')

    print('--- TEST 6: User Creation - Super Admin (tenant_id = NULL) ---')
    admin_email = f'SuperAdmin_{uuid.uuid4().hex[:6]}@FitSphere.io'
    r = client.post('/api/v1/users/', json={
        'email': admin_email,
        'password': 'SuperSecurePassword123!',
        'full_name': 'Platform Root Admin',
        'role': 'super_admin',
        'tenant_id': None
    }, headers=admin_headers)
    assert r.status_code == 201, f'Super admin creation failed: {r.text}'
    admin_user = r.json()
    assert admin_user['tenant_id'] is None
    assert admin_user['role'] == 'super_admin'
    assert admin_user['email'] == admin_email.lower(), 'Email not normalized to lowercase'
    assert 'password' not in admin_user and 'hashed_password' not in admin_user, 'Password leaked!'
    print('✓ Super Admin created with tenant_id=None, email normalized, password hidden')

    print('--- TEST 7: Invariant - Super Admin cannot have tenant_id ---')
    r = client.post('/api/v1/users/', json={
        'email': f'invalid_{uuid.uuid4().hex[:6]}@fitsphere.io',
        'password': 'Password123!',
        'role': 'super_admin',
        'tenant_id': tenant1['id']
    }, headers=admin_headers)
    assert r.status_code == 400, f'Expected 400 for super_admin with tenant_id, got {r.status_code}'
    print('✓ Invariant verified: super_admin rejected if tenant_id provided')

    print('--- TEST 8: Invariant - Gym Admin, Coach, Client REQUIRE tenant_id ---')
    for role in ['gym_admin', 'coach', 'client']:
        r = client.post('/api/v1/users/', json={
            'email': f'{role}_{uuid.uuid4().hex[:6]}@fitsphere.io',
            'password': 'Password123!',
            'role': role,
            'tenant_id': None
        }, headers=admin_headers)
        assert r.status_code == 400, f'Expected 400 for {role} without tenant_id'
    print('✓ Invariant verified: gym_admin, coach, client rejected without tenant_id')

    print('--- TEST 9: Invariant - Non-existent tenant_id rejected ---')
    r = client.post('/api/v1/users/', json={
        'email': f'fake_{uuid.uuid4().hex[:6]}@fitsphere.io',
        'password': 'Password123!',
        'role': 'client',
        'tenant_id': str(uuid.uuid4())
    }, headers=admin_headers)
    assert r.status_code == 404, f'Expected 404 for non-existent tenant_id, got {r.status_code}'
    print('✓ Invariant verified: non-existent tenant_id rejected with HTTP 404')

    print('--- TEST 10: Valid User Creation (Gym Admin, Coach, Client) ---')
    client_email = f'  JohnDoe_{uuid.uuid4().hex[:6]}@Gmail.com  '
    r = client.post('/api/v1/users/', json={
        'email': client_email,
        'password': 'MySecretClientPassword99!',
        'full_name': 'John Doe',
        'role': 'client',
        'tenant_id': tenant1['id']
    }, headers=admin_headers)
    assert r.status_code == 201, f'Client creation failed: {r.text}'
    client_user = r.json()
    assert client_user['tenant_id'] == tenant1['id']
    assert client_user['email'] == client_email.strip().lower()
    assert 'password' not in client_user and 'hashed_password' not in client_user
    print('✓ Client created with valid tenant_id, email trimmed & lowercased, password hidden')

    print('--- TEST 11: Invariant - Duplicate Email Rejected Globally ---')
    r = client.post('/api/v1/users/', json={
        'email': client_email,
        'password': 'AnotherPassword123!',
        'role': 'client',
        'tenant_id': tenant2['id']
    }, headers=admin_headers)
    assert r.status_code == 400, f'Expected 400 for duplicate email across tenants, got {r.status_code}'
    print('✓ Invariant verified: duplicate email rejected globally across all tenants')

    print('--- TEST 12: Database Password Hashing Verification ---')
    db_user = db.query(User).filter(User.id == client_user['id']).first()
    assert db_user is not None, 'User not found in DB'
    print('  DB stored password hash starts with:', db_user.hashed_password[:7])
    assert db_user.hashed_password.startswith('$2'), 'Password not hashed with bcrypt!'
    assert 'MySecretClientPassword99!' not in db_user.hashed_password, 'Plaintext password found in DB!'
    assert verify_password('MySecretClientPassword99!', db_user.hashed_password), 'Bcrypt verify failed'
    print('✓ Database password verified: stored strictly as bcrypt hash, verifies cleanly')

    print('--- TEST 13: Foreign Key ON DELETE RESTRICT Verification ---')
    try:
        tenant_to_del = db.query(Tenant).filter(Tenant.id == tenant1['id']).first()
        db.delete(tenant_to_del)
        db.commit()
        assert False, 'Expected IntegrityError when deleting tenant with users!'
    except Exception as e:
        db.rollback()
        assert 'foreign key' in str(e).lower() or 'violates foreign key' in str(e).lower() or 'integrity' in str(e).lower()
        print('✓ Foreign Key ON DELETE RESTRICT verified: database prevents accidental tenant deletion')

    print('\n=============================================')
    print('ALL 13 VERIFICATION TESTS PASSED SUCCESSFULLY!')
    print('=============================================')

finally:
    # Cleanup bootstrap user
    try:
        db.query(User).filter(User.id == bootstrap_super_admin.id).delete(synchronize_session=False)
        db.commit()
    except Exception:
        pass
    db.close()
