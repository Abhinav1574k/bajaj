const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const assert = require('assert');
const app = require('../src/app');
const Ticket = require('../src/models/Ticket');

let mongoServer;

const runTests = async () => {
  console.log('\n=========================================');
  console.log('🚀 RUNNING SUPPORT TICKET SYSTEM API TESTS');
  console.log('=========================================\n');

  try {
    // 1. Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Override MONGODB_URI in process.env and connect Mongoose
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
    console.log('✅ In-memory MongoDB started and connected.\n');

    let ticketId1;
    let ticketId2;

    // Test 1: Health Check / Welcome Endpoint
    console.log('➡️ Testing: GET / (Welcome / Health Check)');
    const welcomeRes = await request(app).get('/');
    assert.strictEqual(welcomeRes.status, 200);
    assert.strictEqual(welcomeRes.body.success, true);
    console.log('   🟢 Welcome endpoint works!');

    // Test 2: Create a Ticket (Valid Data)
    console.log('\n➡️ Testing: POST /tickets (Create Ticket - Valid)');
    const validTicketData = {
      subject: 'My internet is down',
      description: 'The router is blinking red and I cannot connect to the internet.',
      customerEmail: 'customer@example.com',
      priority: 'high'
    };
    const createRes = await request(app)
      .post('/tickets')
      .send(validTicketData);
    
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.success, true);
    assert.strictEqual(createRes.body.data.subject, validTicketData.subject);
    assert.strictEqual(createRes.body.data.status, 'open'); // Default status
    assert.strictEqual(createRes.body.data.priority, 'high');
    assert.ok(createRes.body.data.createdAt);
    assert.strictEqual(createRes.body.data.resolvedAt, undefined);
    assert.strictEqual(createRes.body.data.slaBreached, false);
    
    ticketId1 = createRes.body.data.id || createRes.body.data._id;
    console.log(`   🟢 Ticket created successfully (ID: ${ticketId1})`);

    // Test 3: Create Ticket with Invalid Email (Validation Error)
    console.log('\n➡️ Testing: POST /tickets (Create Ticket - Invalid Email)');
    const invalidEmailData = {
      subject: 'Email error ticket',
      description: 'Testing email field validation',
      customerEmail: 'not-an-email',
      priority: 'medium'
    };
    const createErrRes = await request(app)
      .post('/tickets')
      .send(invalidEmailData);

    assert.strictEqual(createErrRes.status, 400);
    assert.strictEqual(createErrRes.body.success, false);
    assert.ok(createErrRes.body.messages.some(m => m.includes('valid email')));
    console.log('   🟢 Invalid email rejection and validation message verified!');

    // Test 4: Create Ticket with Missing Required Fields
    console.log('\n➡️ Testing: POST /tickets (Create Ticket - Missing Fields)');
    const missingFieldsData = {
      customerEmail: 'test@example.com'
    };
    const missingErrRes = await request(app)
      .post('/tickets')
      .send(missingFieldsData);

    assert.strictEqual(missingErrRes.status, 400);
    assert.strictEqual(missingErrRes.body.success, false);
    assert.ok(missingErrRes.body.messages.some(m => m.includes('Subject is required')));
    assert.ok(missingErrRes.body.messages.some(m => m.includes('Description is required')));
    console.log('   🟢 Missing fields validations working perfectly!');

    // Test 5: Get All Tickets
    console.log('\n➡️ Testing: GET /tickets (List Tickets)');
    const getRes = await request(app).get('/tickets');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.count, 1);
    console.log('   🟢 Listing tickets verified!');

    // Test 6: Valid Status Transition (open -> in_progress)
    console.log('\n➡️ Testing: PATCH /tickets/:id (Transition: open -> in_progress)');
    const transitionRes1 = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'in_progress' });

    assert.strictEqual(transitionRes1.status, 200);
    assert.strictEqual(transitionRes1.body.data.status, 'in_progress');
    console.log('   🟢 Valid transition (open -> in_progress) allowed!');

    // Test 7: Invalid Status Transition (in_progress -> closed) - Allowed since it is forward!
    // Wait, let's test a real invalid transition: going back from in_progress -> closed? 
    // That's forward but let's test a backward invalid transition: closed -> open (backward 3 steps, which is forbidden since backward can only be one step!).
    // Let's first move the ticket: in_progress -> resolved -> closed
    console.log('\n➡️ Testing: PATCH /tickets/:id (Transition: in_progress -> resolved)');
    const transitionRes2 = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'resolved' });

    assert.strictEqual(transitionRes2.status, 200);
    assert.strictEqual(transitionRes2.body.data.status, 'resolved');
    assert.ok(transitionRes2.body.data.resolvedAt); // moving to resolved sets resolvedAt
    console.log('   🟢 Valid transition (in_progress -> resolved) set resolvedAt!');

    console.log('\n➡️ Testing: PATCH /tickets/:id (Transition: resolved -> closed)');
    const transitionRes3 = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'closed' });

    assert.strictEqual(transitionRes3.status, 200);
    assert.strictEqual(transitionRes3.body.data.status, 'closed');
    assert.ok(transitionRes3.body.data.resolvedAt); // resolvedAt is preserved
    console.log('   🟢 Valid transition (resolved -> closed) preserved resolvedAt!');

    // Now try invalid transition: closed -> open (backward 3 steps)
    console.log('\n➡️ Testing: PATCH /tickets/:id (Invalid Transition: closed -> open)');
    const invalidTransitionRes = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'open' });

    assert.strictEqual(invalidTransitionRes.status, 400);
    assert.strictEqual(invalidTransitionRes.body.success, false);
    assert.ok(invalidTransitionRes.body.error.includes('Invalid status transition'));
    console.log('   🟢 Forbidden transition (closed -> open) rejected with 400!');

    // Test 8: Valid backward transition (closed -> resolved - backward 1 step)
    console.log('\n➡️ Testing: PATCH /tickets/:id (Backward Transition: closed -> resolved)');
    const backwardRes1 = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'resolved' });

    assert.strictEqual(backwardRes1.status, 200);
    assert.strictEqual(backwardRes1.body.data.status, 'resolved');
    assert.ok(backwardRes1.body.data.resolvedAt); // resolvedAt remains
    console.log('   🟢 Valid backward 1-step transition (closed -> resolved) allowed!');

    // Test 9: Valid backward transition (resolved -> in_progress - backward 1 step, clears resolvedAt)
    console.log('\n➡️ Testing: PATCH /tickets/:id (Backward Transition: resolved -> in_progress)');
    const backwardRes2 = await request(app)
      .patch(`/tickets/${ticketId1}`)
      .send({ status: 'in_progress' });

    assert.strictEqual(backwardRes2.status, 200);
    assert.strictEqual(backwardRes2.body.data.status, 'in_progress');
    assert.strictEqual(backwardRes2.body.data.resolvedAt, null); // cleared resolvedAt!
    console.log('   🟢 Valid backward 1-step transition (resolved -> in_progress) cleared resolvedAt!');

    // Test 10: Dynamic SLA and breached=true filter testing
    console.log('\n➡️ Testing: GET /tickets?breached=true (Filter by SLA Breached)');
    // Let's create an urgent ticket
    const urgentTicketRes = await request(app)
      .post('/tickets')
      .send({
        subject: 'URGENT database error',
        description: 'The production database is unresponsive.',
        customerEmail: 'admin@company.com',
        priority: 'urgent'
      });
    
    ticketId2 = urgentTicketRes.body.data.id || urgentTicketRes.body.data._id;
    
    // Seed it to be in the past to trigger an SLA breach (urgent SLA target is 1 hour = 60 minutes)
    // We will update the createdAt timestamp directly in the database using Mongoose
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await Ticket.findByIdAndUpdate(ticketId2, { createdAt: threeHoursAgo });
    console.log(`   💡 Seeded urgent ticket (ID: ${ticketId2}) with createdAt set to 3 hours ago.`);

    // Fetch using breached=true
    const breachedRes = await request(app).get('/tickets?breached=true');
    assert.strictEqual(breachedRes.status, 200);
    assert.strictEqual(breachedRes.body.count, 1);
    assert.strictEqual(breachedRes.body.data[0]._id.toString(), ticketId2.toString());
    assert.strictEqual(breachedRes.body.data[0].slaBreached, true);
    console.log('   🟢 Filter breached=true works and returns the breached ticket!');

    // Test 11: GET /tickets/stats
    console.log('\n➡️ Testing: GET /tickets/stats (Dashboard Metrics)');
    const statsRes = await request(app).get('/tickets/stats');
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsRes.body.success, true);
    assert.strictEqual(statsRes.body.stats.totalTickets, 2);
    assert.strictEqual(statsRes.body.stats.breachedCount, 1);
    assert.strictEqual(statsRes.body.stats.statusCounts.in_progress, 1);
    assert.strictEqual(statsRes.body.stats.statusCounts.open, 1);
    console.log('   🟢 Stats endpoint computed correctly!');

    // Test 12: DELETE /tickets/:id
    console.log('\n➡️ Testing: DELETE /tickets/:id (Delete Ticket)');
    const deleteRes = await request(app).delete(`/tickets/${ticketId1}`);
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.success, true);

    const checkDeletedRes = await request(app).get('/tickets');
    assert.strictEqual(checkDeletedRes.body.count, 1); // Only 1 ticket remains
    console.log('   🟢 Ticket deletion verified!');

    console.log('\n=========================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% OK');
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    // 2. Tear down in-memory MongoDB and Mongoose connection
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('🧹 Test teardown complete.');
    process.exit(0);
  }
};

runTests();
