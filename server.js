const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database('./jobtracker.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      employees TEXT,
      link TEXT NOT NULL
    )`);
  }
});

// API Endpoints
// Get all jobs
app.get('/api/jobs', (req, res) => {
  db.all('SELECT * FROM jobs ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add new job
app.post('/api/jobs', (req, res) => {
  const { id, date, company, position, employees, link } = req.body;
  
  db.run(
    'INSERT INTO jobs (id, date, company, position, employees, link) VALUES (?, ?, ?, ?, ?, ?)',
    [id, date, company, position, employees, link],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ message: 'Job added successfully', id: id });
    }
  );
});

// Update job
app.put('/api/jobs/:id', (req, res) => {
  const { date, company, position, employees, link } = req.body;
  
  db.run(
    'UPDATE jobs SET date = ?, company = ?, position = ?, employees = ?, link = ? WHERE id = ?',
    [date, company, position, employees, link, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      
      res.json({ message: 'Job updated successfully' });
    }
  );
});

// Delete job
app.delete('/api/jobs/:id', (req, res) => {
  db.run('DELETE FROM jobs WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    res.json({ message: 'Job deleted successfully' });
  });
});

// Import jobs
app.post('/api/import', (req, res) => {
  const jobs = req.body;
  
  if (!Array.isArray(jobs)) {
    res.status(400).json({ error: 'Invalid data format' });
    return;
  }
  
  const stmt = db.prepare('INSERT OR REPLACE INTO jobs (id, date, company, position, employees, link) VALUES (?, ?, ?, ?, ?, ?)');
  
  try {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      for (const job of jobs) {
        stmt.run(job.id, job.date, job.company, job.position, job.employees, job.link);
      }
      
      db.run('COMMIT');
      res.json({ message: 'Jobs imported successfully' });
    });
  } catch (err) {
    db.run('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    stmt.finalize();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
