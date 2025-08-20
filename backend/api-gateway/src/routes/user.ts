import { Router, Request, Response, NextFunction } from 'express';
import { userServiceMethods } from '../grpc/client';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';
import Joi from 'joi';
import * as Types from '../types/grpc';
import { updateUserSchema } from '../utils/helper';


const router = Router();

router.use(authMiddleware);


router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  console.log("calledddd")
  try {
    const response: Types.GetUserResponse = await userServiceMethods.getUser({
      userId: req.user!.id,
    });

    if (!response.success || !response.user) {
      throw new ApiError(404, response.error || 'User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          first_name: response.user.firstName,
          last_name: response.user.lastName,
          avatar_url: response.user.avatarUrl,
          role: response.user.role,
          status: response.user.status,
          email_verified: response.user.emailVerified,
          created_at: response.user.createdAt,
          updated_at: response.user.updatedAt,
          last_login: response.user.lastLogin,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const response: Types.UpdateUserResponse = await userServiceMethods.updateUser({
      userId: req.user!.id,
      firstName: value.first_name || '',
      lastName: value.last_name || '',
      username: value.username || '',
      avatarUrl: value.avatar_url || '',
    });

    if (!response.success || !response.user) {
      throw new ApiError(400, response.error || 'Failed to update user');
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          first_name: response.user.firstName,
          last_name: response.user.lastName,
          avatar_url: response.user.avatarUrl,
          role: response.user.role,
          updated_at: response.user.updatedAt,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user preferences
router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: Types.GetPreferencesResponse = await userServiceMethods.getPreferences({
      userId: req.user!.id,
    });

    if (!response.success || !response.preferences) {
      throw new ApiError(404, response.error || 'Preferences not found');
    }

    res.json({
      success: true,
      data: {
        preferences: {
          user_id: response.preferences.userId,
          theme: response.preferences.theme,
          language: response.preferences.language,
          timezone: response.preferences.timezone,
          notifications_enabled: response.preferences.notificationsEnabled,
          email_notifications: response.preferences.emailNotifications,
          push_notifications: response.preferences.pushNotifications,
          ai_preferences: response.preferences.aiPreferences,
          profile_visibility: response.preferences.profileVisibility,
          data_sharing: response.preferences.dataSharing,
          updated_at: response.preferences.updatedAt,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: Types.UpdatePreferencesResponse = await userServiceMethods.updatePreferences({
      preferences: {
        userId: req.user!.id,
        theme: req.body.theme || 'system',
        language: req.body.language || 'en',
        timezone: req.body.timezone || 'UTC',
        notificationsEnabled: req.body.notifications_enabled ?? true,
        emailNotifications: req.body.email_notifications ?? true,
        pushNotifications: req.body.push_notifications ?? true,
        aiPreferences: req.body.ai_preferences || {},
        profileVisibility: req.body.profile_visibility || 'public',
        dataSharing: req.body.data_sharing ?? false,
      }
    });

    if (!response.success || !response.preferences) {
      throw new ApiError(400, response.error || 'Failed to update preferences');
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: {
          user_id: response.preferences.userId,
          theme: response.preferences.theme,
          language: response.preferences.language,
          timezone: response.preferences.timezone,
          notifications_enabled: response.preferences.notificationsEnabled,
          email_notifications: response.preferences.emailNotifications,
          push_notifications: response.preferences.pushNotifications,
          ai_preferences: response.preferences.aiPreferences,
          profile_visibility: response.preferences.profileVisibility,
          data_sharing: response.preferences.dataSharing,
          updated_at: response.preferences.updatedAt,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userServiceMethods.deleteUser({
      userId: req.user!.id,
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;