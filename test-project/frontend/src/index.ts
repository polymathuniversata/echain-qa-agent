import express from 'express';
import { UserService } from './user-service';

const app = express();
const port = process.env.PORT || 3000;
const userService = new UserService();

app.use(express.json());

// Routes
app.get('/users', (req, res) => {
  const users = userService.getAllUsers();
  res.json(users);
});

app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = userService.getUserById(id);

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const newUser = userService.addUser({ name, email });
  res.status(201).json(newUser);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;