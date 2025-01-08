export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  refresh_token_id: string;
  userId: string;
};

export type OAuth2Profile = {
  provider: string;
  id?: string;
  displayName?: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
  }>;
  photos?: Array<{
    value: string;
  }>;
};

export type FusionAuthUser = Omit<OAuth2Profile, "name"> & {
  accessToken: string;
  accessTokenExpiresAt: number;
  applicationId: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  name: any;
  refreshToken: string;
  roles: string[];
  scope: string;
  sub: string;
  tid: string;
};

export type UserSubscription = {
  id: string;
  paddleSubscriptionId: string | null;
  isOnPaidPlan: boolean;
  isOnFreeTrial: boolean;
  isExpired: boolean;
  hasBillingIssue: boolean;
  isCancelling: boolean;
  hasPaymentMethod: boolean;
  isActive: boolean;
  isPaused: boolean;
  activePaymentSystem: string | null;
  endDate: Date | null;
};

export type UserStatistics = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  userId: string;
  currentStreak: number;
  totalStreak: number;
  longestStreak: number;
  totalPoints: number;
  lastLocalVisitISO?: string;
  lastVisitedPointerId?: string;
  lastVisitISO?: string;
  totalExercisesCompleted: number;
  totalExerciseSetsCompleted: number;
  totalExercisesReviewed: number;
  totalExerciseSetsReviewed: number;
  categoryStatistics: UserCategoryStatistics[];
  totalTasksCompleted: number;
  totalChallengesCompleted: number;
  totalLvl1Completed: number;
  totalLvl2Completed: number;
  totalLvl3Completed: number;
  exerciseReportsDone: number;
  combo3Count: number;
  combo5Count: number;
  combo10Count: number;
  quickshotCount: number;
  coins: number;
};

export type UserCategoryStatistics = {
  id: string;
  UserStatistics?: UserStatistics;
  userStatisticsId?: string;
  category: string;
  exercisesCompleted: number;
  exerciseSetsCompleted: number;
  tasksCompleted: number;
  challengesCompleted: number;
  exercisesReviewed: number;
  exerciseSetsReviewed: number;
  lvl1Completed: number;
  lvl2Completed: number;
  lvl3Completed: number;
};

export type User = {
  id: string;
  fusionAuthId: string;
  emailVerified: boolean;
  email: string;
  subscriptionId: string;
  additionalData?: { [key: string]: any };
  name: string;
  avatarUrl: string;
  createdAt: string;
};

export type LoggedUser = Omit<User, "additionalData"> & {
  UserStatistics: UserStatistics | null;
  additionalData: { [key: string]: any };
  oAuthProfile: FusionAuthUser;
  subscription?: UserSubscription | null;
  unclaimedPrizesCount?: number;
  unseenAchievements: {
    Prizes: {
      claimed: boolean;
      id: string;
      prizeType: "coins" | "pointer" | "points";
      shown: boolean;
    }[];
    description: null | string;
    id: string;
    title: string;
    type: string;
  }[];
};
