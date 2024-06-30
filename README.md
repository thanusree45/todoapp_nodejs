# todoapp_nodejs

# Todo Application

A simple Todo Application built with Node.js and SQLite.

## Getting Started

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Start the server with `node app.js`.

## API Endpoints

- **GET /todos/**: Retrieve todos with query parameters for filtering by status, priority, category, or search term.
- **GET /todos/:todoId/**: Retrieve a specific todo by ID.
- **GET /agenda/**: Retrieve todos by due date.
- **POST /todos/**: Create a new todo.
- **PUT /todos/:todoId/**: Update a specific todo.
- **DELETE /todos/:todoId/**: Delete a specific todo.

## Database Schema

**Todo Table**

| Column   | Type    |
| -------- | ------- |
| id       | INTEGER |
| todo     | TEXT    |
| category | TEXT    |
| priority | TEXT    |
| status   | TEXT    |
| due_date | DATE    |

## Invalid Scenarios

- Invalid Status: `400 - Invalid Todo Status`
- Invalid Priority: `400 - Invalid Todo Priority`
- Invalid Category: `400 - Invalid Todo Category`
- Invalid Due Date: `400 - Invalid Due Date`
