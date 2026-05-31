import type { NextConfig } from "next";
import path from "path";

/** 휴대폰 등 LAN에서 dev 서버 접속 시 _next 리소스 허용 (예: 192.168.0.13:3000) */
const allowedDevOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  ...(process.env.NEXT_PUBLIC_DEV_ORIGIN
    ? [process.env.NEXT_PUBLIC_DEV_ORIGIN.replace(/^https?:\/\//, "")]
    : []),
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  ...(process.env.NODE_ENV === "development"
    ? { allowedDevOrigins }
    : {}),
};

export default nextConfig;
