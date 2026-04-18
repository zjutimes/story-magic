import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 简单的测试路由
app.post('/api/story/generate', async (req, res) => {
  console.log('Received request:', req.body);
  res.json({ success: true, message: 'Server is working!', data: req.body });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
