export default function handler(req: any, res: any) {
  return res.status(200).json({
    success: true,
    message: "SM Associate API is running.",
    environment: process.env.NODE_ENV ?? "production"
  });
}
