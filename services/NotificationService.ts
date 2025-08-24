import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Random app engagement messages
const RANDOM_APP_MESSAGES = [
  {
    title: "Have you met anyone new recently? 👀",
    body: "Add them to your profiles so you never forget the important details🧠"
  },
  {
    title: "A quick hello can go a long way 🙂",
    body: "Double check ARMi profiles so you can get the details right 😼"
  },
  {
    title: "Don't let your roster go quiet 🔔",
    body: "Check upcoming reminders, add new people, and check in with people you haven't spoken to in awhile."
  },
  {
    title: "Are your profiles up to date🤔",
    body: "Open ARMi to review notes, update details, and keep your roster fresh."
  },
  {
    title: "Check in with your people 👋",
    body: "Don't forget the important details — ARMi has your back."
  }
];

class NotificationServiceClass {
  private isInitialized = false;
  private randomNotificationId: string | null = null;

  async init() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private getRandomFutureDateTime(): Date {
    const now = new Date();
    
    // Random number of days from 1 to 7
    const randomDays = Math.floor(Math.random() * 7) + 1;
    
    // Random hour between 8 AM (8) and 8 PM (20)
    const randomHour = Math.floor(Math.random() * 12) + 8; // 8-19 (8 AM to 7 PM)
    
    // Random minute
    const randomMinute = Math.floor(Math.random() * 60);
    
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + randomDays);
    futureDate.setHours(randomHour, randomMinute, 0, 0);
    
    // Ensure it's at least 1 hour from now
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (futureDate <= oneHourFromNow) {
      // If the random time is too soon, schedule for tomorrow at the same random time
      futureDate.setDate(now.getDate() + 1);
    }
    
    return futureDate;
  }

  async scheduleRandomAppNotification() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.init();
        if (!initialized) {
          console.warn('Cannot schedule random notification - notifications not initialized');
          return null;
        }
      }

      // Cancel any existing random notification
      if (this.randomNotificationId) {
        await this.cancelNotification(this.randomNotificationId);
        this.randomNotificationId = null;
      }

      // Get a random message
      const randomMessage = RANDOM_APP_MESSAGES[Math.floor(Math.random() * RANDOM_APP_MESSAGES.length)];
      
      // Get a random future date/time
      const scheduledDate = this.getRandomFutureDateTime();
      
      console.log('Scheduling random app notification for:', scheduledDate.toLocaleString());
      console.log('Random message:', randomMessage.title);

      // Create notification content
      const notificationContent: Notifications.NotificationContentInput = {
        title: randomMessage.title,
        body: randomMessage.body,
        data: {
          type: 'random_app_engagement',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      };
      
      // Schedule the notification
      const triggerObject = {
        date: scheduledDate,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      };
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: triggerObject,
      });

      this.randomNotificationId = notificationId;
      
      // Store the notification ID for persistence
      await AsyncStorage.setItem('random_notification_id', notificationId);

      console.log(`Scheduled random app notification ${notificationId} for ${scheduledDate.toLocaleString()}`);
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule random app notification:', error);
      return null;
    }
  }

  async startRandomAppNotifications() {
    try {
      console.log('Starting random app notifications...');
      await this.scheduleRandomAppNotification();
    } catch (error) {
      console.error('Failed to start random app notifications:', error);
    }
  }

  async stopRandomAppNotifications() {
    try {
      console.log('Stopping random app notifications...');
      
      // Cancel current random notification if it exists
      if (this.randomNotificationId) {
        await this.cancelNotification(this.randomNotificationId);
        this.randomNotificationId = null;
      }
      
      // Also try to cancel using stored ID
      const storedId = await AsyncStorage.getItem('random_notification_id');
      if (storedId) {
        await this.cancelNotification(storedId);
        await AsyncStorage.removeItem('random_notification_id');
      }
      
      console.log('Random app notifications stopped');
    } catch (error) {
      console.error('Failed to stop random app notifications:', error);
    }
  }

  async restoreRandomNotificationId() {
    try {
      const storedId = await AsyncStorage.getItem('random_notification_id');
      if (storedId) {
        this.randomNotificationId = storedId;
      }
    } catch (error) {
      console.error('Failed to restore random notification ID:', error);
    }
  }

  async scheduleReminderNotification(reminder: {
    id: number;
    title: string;
    description?: string;
    scheduledFor: Date;
    profileName?: string;
  }) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.init();
        if (!initialized) {
          throw new Error('Notifications not initialized');
        }
      }

      // Use the scheduled date directly and ensure it's in the future
      const scheduledDate = reminder.scheduledFor;
      const now = new Date();

      console.log('Scheduling notification for:', scheduledDate.toLocaleString());
      console.log('Current time:', now.toLocaleString());
      console.log('Time difference (ms):', scheduledDate.getTime() - now.getTime());
      
      // Enhanced debugging
      console.log('🔍 DETAILED DEBUG - Scheduled Date ISO:', scheduledDate.toISOString());
      console.log('🔍 DETAILED DEBUG - Current Date ISO:', now.toISOString());
      console.log('🔍 DETAILED DEBUG - Time difference (ms):', scheduledDate.getTime() - now.getTime());
      console.log('🔍 DETAILED DEBUG - Time difference (minutes):', (scheduledDate.getTime() - now.getTime()) / (1000 * 60));
      console.log('🔍 DETAILED DEBUG - Scheduled Date Local Components:', {
        year: scheduledDate.getFullYear(),
        month: scheduledDate.getMonth(),
        day: scheduledDate.getDate(),
        hour: scheduledDate.getHours(),
        minute: scheduledDate.getMinutes(),
        second: scheduledDate.getSeconds()
      });
      
      if (scheduledDate <= now) {
        console.warn('Cannot schedule notification for past date:', scheduledDate);
        return null;
      }

      // Add buffer to ensure notification is scheduled far enough in the future
      const timeDifferenceMs = scheduledDate.getTime() - now.getTime();
      const minimumBufferMs = 5000; // 5 seconds
      
      if (timeDifferenceMs < minimumBufferMs) {
        console.log(`🔍 BUFFER DEBUG - Time difference too small (${timeDifferenceMs}ms), adding buffer`);
        scheduledDate.setTime(now.getTime() + minimumBufferMs);
        console.log(`🔍 BUFFER DEBUG - Adjusted scheduled time to: ${scheduledDate.toLocaleString()}`);
      } else {
        console.log(`🔍 BUFFER DEBUG - Time difference sufficient (${timeDifferenceMs}ms), no buffer needed`);
      }

      // Log trigger date and time difference before scheduling
      console.log('[REM TEST] Trigger date', scheduledDate.toString(), 'ms from now:', scheduledDate.getTime() - Date.now());

      // Create notification content
      const notificationContent: Notifications.NotificationContentInput = {
        title: reminder.title,
        body: reminder.description || (reminder.profileName ? `Reminder about ${reminder.profileName}` : 'You have a reminder'),
        data: {
          reminderId: reminder.id,
          type: 'reminder',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
      
      // Schedule the notification with Date trigger
      const triggerObject = {
        date: scheduledDate,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      };
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: triggerObject,
      });

      console.log(`Scheduled notification ${notificationId} for reminder ${reminder.id} at ${scheduledDate.toLocaleString()}`);
      
      // Check all scheduled notifications after scheduling
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[REM TEST] scheduled count:', allScheduled.length, allScheduled);
      
      // Check for Expo Go limitation
      if (allScheduled.length === 0) {
        console.warn('Expo Go limitation – use a dev build to test timing');
      }
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Handle notification responses (when user taps on notification)
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Handle notifications received while app is in foreground
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

const NotificationService = new NotificationServiceClass();
export default NotificationService;