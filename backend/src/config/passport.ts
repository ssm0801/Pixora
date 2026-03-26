import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import User from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from Google'), undefined);
        }

        const firstName = profile.name?.givenName || profile.displayName.split(' ')[0] || 'User';
        const lastName = profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || '';
        const avatar = profile.photos?.[0]?.value;

        // Check if a user with this googleId already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if an email-based account exists → link it
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
          } else {
            // Brand new user via Google
            user = new User({ email, googleId: profile.id });
          }
        }

        // Block deactivated accounts
        if (user.isActive === false) {
          const err = new Error('Account deactivated') as any;
          err.code = 'ACCOUNT_DEACTIVATED';
          return done(err, undefined);
        }

        // Always sync name + avatar from Google on every login
        user.firstName = firstName;
        user.lastName = lastName;
        if (avatar) user.avatar = avatar;
        await user.save();

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;
