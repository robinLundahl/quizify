-- Enable Row Level Security on all public tables.
-- Prisma connects as the postgres superuser which bypasses RLS, so no
-- policies are needed — this simply closes off the Supabase REST API
-- (PostgREST / anon key) from reaching any table directly.

ALTER TABLE "User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerification"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quiz"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnswerOption"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MapQuestion"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MapRing"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AudioQuestion"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RankingItem"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameSession"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Participant"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameAnswer"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceListing"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizPurchase"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizRental"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorPayout"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceReview"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountOffer"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingReport"       ENABLE ROW LEVEL SECURITY;
