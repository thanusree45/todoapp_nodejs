const express = require('express')
const app = express()
app.use(express.json())
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const {format} = require('date-fns')

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

// Initialize the database and server
const initializedbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    // Create the 'todo' table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        dueDate TEXT NOT NULL
      );
    `)

    // Insert sample data if the table is empty
    const testData = await db.get('SELECT COUNT(*) as count FROM todo;')
    if (testData.count === 0) {
      await db.run(`INSERT INTO todo (todo, priority, status, category, dueDate) VALUES 
        ('Watch Movie', 'LOW', 'TO DO', 'WORK', '2021-09-22'), 
        ('Complete Homework', 'HIGH', 'IN PROGRESS', 'HOME', '2021-03-21'), 
        ('Exercise', 'MEDIUM', 'DONE', 'LEARNING', '2021-08-13');`)
    }

    // Start the server
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000')
    })
  } catch (error) {
    console.log(`Error ${error.message}`)
    process.exit(1)
  }
}

initializedbAndServer()

// Validate the fields of a todo item
const validateTodoFields = todo => {
  const {status, priority, category, dueDate} = todo
  const validStatuses = ['TO DO', 'IN PROGRESS', 'DONE']
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
  const validCategories = ['WORK', 'HOME', 'LEARNING']

  if (status && !validStatuses.includes(status)) {
    return 'Invalid Todo Status'
  }
  if (priority && !validPriorities.includes(priority)) {
    return 'Invalid Todo Priority'
  }
  if (category && !validCategories.includes(category)) {
    return 'Invalid Todo Category'
  }
  if (dueDate && isNaN(Date.parse(dueDate))) {
    return 'Invalid Due Date'
  }
  return null
}

// Format the response for a todo item
const formatResponse = todo => ({
  id: todo.id,
  todo: todo.todo,
  priority: todo.priority,
  status: todo.status,
  category: todo.category,
  dueDate: format(new Date(todo.due_date), 'yyyy-MM-dd'),
})

// API 1: Get Todos with Filters
app.get('/todos/', async (request, response) => {
  const {status, priority, category, search_q} = request.query
  let query = 'SELECT * FROM todo WHERE 1=1'
  const queryParams = []

  if (status) {
    const error = validateTodoFields({status})
    if (error) {
      return response.status(400).send(error)
    }
    query += ' AND status = ?'
    queryParams.push(status)
  }

  if (priority) {
    const error = validateTodoFields({priority})
    if (error) {
      return response.status(400).send(error)
    }
    query += ' AND priority = ?'
    queryParams.push(priority)
  }

  if (category) {
    const error = validateTodoFields({category})
    if (error) {
      return response.status(400).send(error)
    }
    query += ' AND category = ?'
    queryParams.push(category)
  }

  if (search_q) {
    query += ' AND todo LIKE ?'
    queryParams.push(`%${search_q}%`)
  }

  const todos = await db.all(query, ...queryParams)
  response.send(todos.map(formatResponse))
})

// API 2: Get Todos by Priority and Status
app.get('/todos/status/priority', async (req, res) => {
  const {priority = 'HIGH', status = ''} = req.query
  const getTodosQuery = `SELECT * FROM todo WHERE
      priority = '${priority}' AND status LIKE '%${status}%';`
  const todos = await db.all(getTodosQuery)
  res.send(
    todos.map(todo => ({
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
    })),
  )
})

// API 3: Get Todo by ID
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todo = await db.get('SELECT * FROM todo WHERE id = ?', todoId)

  if (todo) {
    response.send(formatResponse(todo))
  } else {
    response.status(404).send('Todo Not Found')
  }
})

// API 4: Get Todos by Due Date
app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  if (isNaN(Date.parse(date))) {
    return response.status(400).send('Invalid Due Date')
  }

  const formattedDate = format(new Date(date), 'yyyy-MM-dd')
  const todos = await db.all(
    'SELECT * FROM todo WHERE due_date = ?',
    formattedDate,
  )
  response.send(todos.map(formatResponse))
})

// API 5: Create a new Todo
app.post('/todos/', async (req, res) => {
  const {id, todo, priority, status, category, dueDate} = req.body

  const validationError = validateTodoFields(req.body)
  if (validationError) {
    return res.status(400).send(validationError)
  }

  const formattedDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
  const createTodoQuery = `
    INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDueDate}')
  `
  await db.run(createTodoQuery)
  res.status(200).send('Todo Successfully Added')
})

// API 6: Update a Todo by ID
app.put('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const {status, priority, todo, category, dueDate} = req.body

  const validationError = validateTodoFields(req.body)
  if (validationError) {
    return res.status(400).send(validationError)
  }

  const currentTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`
  const currentTodo = await db.get(currentTodoQuery)
  if (!currentTodo) {
    return res.status(404).send('Todo Not Found')
  }

  const updatedFields = []
  if (status) updatedFields.push('Status Updated')
  if (priority) updatedFields.push('Priority Updated')
  if (todo) updatedFields.push('Todo Updated')
  if (category) updatedFields.push('Category Updated')
  if (dueDate) updatedFields.push('Due Date Updated')

  const updatedTodo = {
    ...currentTodo,
    status: status || currentTodo.status,
    priority: priority || currentTodo.priority,
    todo: todo || currentTodo.todo,
    category: category || currentTodo.category,
    due_date: dueDate
      ? format(new Date(dueDate), 'yyyy-MM-dd')
      : currentTodo.due_date,
  }

  const updateTodoQuery = `
    UPDATE todo
    SET
      status = '${updatedTodo.status}',
      priority = '${updatedTodo.priority}',
      todo = '${updatedTodo.todo}',
      category = '${updatedTodo.category}',
      due_date = '${updatedTodo.due_date}'
    WHERE id = ${todoId}
  `
  await db.run(updateTodoQuery)

  res.send(updatedFields.join(', '))
})

// API 7: Delete a Todo by ID
app.delete('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId}`
  await db.run(deleteTodoQuery)
  res.send('Todo Deleted')
})

module.exports = app
