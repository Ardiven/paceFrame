import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PaceFrame Server is running on port ${PORT}`);
  console.log(`📡 Ready to serve mobile requests at http://localhost:${PORT}`);
});
