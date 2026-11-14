import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

// body parser
app.use(express.json());

export default app;
