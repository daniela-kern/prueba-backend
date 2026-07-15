import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { router } from "./routes/index.js";
import { AppError } from "./errors/AppError.js";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(router);

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
      return;
    }

    const pgError = error as {
      code?: string;
      constraint?: string;
    };

    if (pgError?.code === "23505") {
      res.status(409).json({
        code: "DUPLICATE_RESOURCE",
        message: "El recurso ya existe",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error inesperado",
    });
  },
);
