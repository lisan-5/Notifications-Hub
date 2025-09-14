import { Router } from "express"

const router = Router()

router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "notifications-hub-api",
    version: "1.0.0",
  })
})

export { router as healthRoutes }
