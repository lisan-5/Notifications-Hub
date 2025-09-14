import { Router } from "express"
import { body, validationResult } from "express-validator"
import { UserService } from "../services/UserService"

const router = Router()
const userService = new UserService()

// Create or update user
router.post(
  "/",
  [body("id").isString().notEmpty(), body("email").isEmail().optional(), body("phone").isMobilePhone("any").optional()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const user = await userService.createOrUpdateUser(req.body)
      res.status(201).json({ success: true, user })
    } catch (error) {
      console.error("Error creating/updating user:", error)
      res.status(500).json({ error: "Failed to create/update user" })
    }
  },
)

// Get user
router.get("/:id", async (req, res) => {
  try {
    const user = await userService.getUser(req.params.id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

// Update user preferences
router.patch("/:id/preferences", [body("preferences").isObject()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const user = await userService.updateUserPreferences(req.params.id, req.body.preferences)
    res.json({ success: true, user })
  } catch (error) {
    console.error("Error updating user preferences:", error)
    res.status(500).json({ error: "Failed to update preferences" })
  }
})

export { router as userRoutes }
