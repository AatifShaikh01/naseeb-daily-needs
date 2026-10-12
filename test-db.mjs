import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const result = await sql`select now() as time`;
console.log("Connected! Server time:", result[0].time);