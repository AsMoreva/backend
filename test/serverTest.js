const request = require('supertest');
const app = require('../server/server');
const pool = require('../server/db')

describe('API Tests', () => {
  // Тест регистрации пользователя
  it('POST /api/register - должно регистрировать пользователя', async () => {
    const response = await request(app).post('/api/register').send({
      username: 'testuser',
      password: 'testpassword',
    });

    expect(response.status).toBe(201);
    expect(response.text).toBe('User registered');
  });

  // Тест авторизации пользователя
  it('POST /api/login - должно авторизовать пользователя', async () => {
    const response = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  // Тест на получение списка доходов и расходов (GET /api/transactions)
  it('GET /api/transactions - должно вернуть список доходов и расходов', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    const token = loginResponse.body.token;
    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  // Тест на добавление записи дохода или расхода
  it('POST /api/transactions - должно добавлять новую запись', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    const token = loginResponse.body.token;
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income', amount: 1000, description: 'Salary', date: '2024-12-31' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.type).toBe('income');
    expect(response.body.amount).toBe(1000);
  });

  // Тест на обновление записи дохода или расхода
  it('PUT /api/transactions/:id - должно обновлять запись дохода или расхода', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    const token = loginResponse.body.token;
    const newTransactionResponse = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 500, description: 'Groceries', date: '2024-12-31' });

    const transactionId = newTransactionResponse.body.id;
    const updateResponse = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 600, description: 'Groceries updated', date: '2024-12-31' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.amount).toBe(600);
    expect(updateResponse.body.description).toBe('Groceries updated');
  });

  // Тест на удаление записи дохода или расхода
  it('DELETE /api/transactions/:id - должно удалять запись дохода или расхода', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    const token = loginResponse.body.token;
    const newTransactionResponse = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 300, description: 'Transport', date: '2024-12-31' });

    const transactionId = newTransactionResponse.body.id;
    const deleteResponse = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);
  });

  // Тест на изменение пароля
  it('PUT /api/editpasswd - должно изменять пароль пользователя', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    const token = loginResponse.body.token;
    const response = await request(app)
      .put('/api/editpasswd')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPasswd: 'testpassword', newPasswd: 'newtestpassword' });

    expect(response.status).toBe(204);

    // Проверка нового пароля
    const reloginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'newtestpassword',
    });
    expect(reloginResponse.status).toBe(200);
    expect(reloginResponse.body).toHaveProperty('token');
  });

  // Тест на удаление аккаунта
  it('DELETE /api/deleteacc - должно удалять аккаунт пользователя', async () => {
    const loginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'newtestpassword',
    });

    const token = loginResponse.body.token;
    const response = await request(app)
      .delete('/api/deleteacc')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);

    // Проверка отсутствия пользователя
    const reloginResponse = await request(app).post('/api/login').send({
      username: 'testuser',
      password: 'newtestpassword',
    });
    expect(reloginResponse.status).toBe(401);
    expect(reloginResponse.text).toBe('User not found');
  });

});
