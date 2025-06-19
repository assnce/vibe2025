@@ -2,86 +2,145 @@ const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { URL } = require('url');

const PORT = 3000;

// Database connection settings
// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    password: '0000',
    database: 'todolist',
  };
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

  async function retrieveListItems() {
// Retrieve all items from the database
async function getItems() {
    try {
      // Create a connection to the database
      const connection = await mysql.createConnection(dbConfig);

      // Query to select all items from the database
      const query = 'SELECT id, text FROM items';

      // Execute the query
      const [rows] = await connection.execute(query);

      // Close the connection
      await connection.end();

      // Return the retrieved items as a JSON array
      return rows;
        const [rows] = await pool.query('SELECT id, text FROM items ORDER BY id');
        return rows;
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
        console.error('Error retrieving items:', error);
        throw error;
    }
  }
}

// Stub function for generating HTML rows
async function getHtmlRows() {
    // Example data - replace with actual DB data later
    /*
    const todoItems = [
        { id: 1, text: 'First todo item' },
        { id: 2, text: 'Second todo item' }
    ];*/
// Add a new item to the database
async function addItem(text) {
    try {
        const [result] = await pool.query('INSERT INTO items (text) VALUES (?)', [text]);
        return result.insertId;
    } catch (error) {
        console.error('Error adding item:', error);
        throw error;
    }
}

    const todoItems = await retrieveListItems();
// Delete an item from the database
async function deleteItem(id) {
    try {
        await pool.query('DELETE FROM items WHERE id = ?', [id]);
        // Reset auto-increment and renumber items
        await pool.query('SET @count = 0');
        await pool.query('UPDATE items SET items.id = @count:= @count + 1');
        await pool.query('ALTER TABLE items AUTO_INCREMENT = 1');
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

    // Generate HTML for each item
    return todoItems.map(item => `
// Generate HTML rows for the todo list with sequential numbers
async function generateListRows() {
    const items = await getItems();
    return items.map((item, index) => `
        <tr>
            <td>${item.id}</td>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
            <td><button class="delete-btn" onclick="deleteItem(${item.id})">Delete</button></td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
// Handle HTTP requests
async function handleRequest(req, res) {
    if (req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );

            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (url.pathname === '/' && req.method === 'GET') {
            // Serve the HTML page
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const rows = await generateListRows();
            const renderedHtml = html.replace('{{rows}}', rows);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
            res.end(renderedHtml);
        } else if (url.pathname === '/add' && req.method === 'POST') {
            // Handle adding new item
            let body = '';
            req.on('data', chunk => body += chunk.toString());

            req.on('end', async () => {
                try {
                    const { text } = JSON.parse(body);
                    if (!text || typeof text !== 'string') {
                        throw new Error('Invalid input');
                    }

                    await addItem(text);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error(error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid input' }));
                }
            });
        } else if (url.pathname.startsWith('/delete/') && req.method === 'DELETE') {
            // Handle deleting item
            const id = parseInt(url.pathname.split('/')[2]);
            if (isNaN(id)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid ID' }));
                return;
            }

            try {
                await deleteItem(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error(error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Failed to delete item' }));
            }
        } else {
            // Not found
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

// Create and start server
// Create and start the server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nClosing database pool and shutting down server...');
    await pool.end();
    server.close(() => {
        console.log('Server has been stopped');
        process.exit(0);
    });
});
