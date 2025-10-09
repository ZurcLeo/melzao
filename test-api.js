const Database = require('./server/database');

async function testAPI() {
  try {
    await Database.initialize();

    console.log('=== Testing /api/admin/users query ===');

    const query = `
      SELECT id, email, name, role, status, created_at, approved_at, last_login
      FROM users
      WHERE 1=1
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `;

    const users = await Database.all(query, [200, 0]);

    console.log('\nUsers returned:', users.length);
    console.log('\nUsers:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}, Status: ${user.status}`);
    });

    await Database.close();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAPI();
