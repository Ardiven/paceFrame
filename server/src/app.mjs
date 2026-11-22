import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();

console.log("APP TYPE:", typeof app);
console.log("APP LISTEN:", typeof app.listen);
console.log("APP HANDLE:", typeof app.handle);

export default app;