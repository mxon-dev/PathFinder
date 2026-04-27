import axios from "axios";
import { env } from "@/shared/config/env";

export const api = axios.create({
  baseURL: env.apiBaseUrl || undefined,
  headers: { "Content-Type": "application/json" },
});
