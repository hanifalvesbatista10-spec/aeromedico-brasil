import { getRepositories } from "@/lib/repositories";
import { HeroSection } from "@/components/sections/hero-section";
import { AuthorityStrip } from "@/components/sections/authority-strip";
import { AboutSection } from "@/components/sections/about-section";
import { ExpertisePillars } from "@/components/sections/expertise-pillars";
import { FeaturedPrograms } from "@/components/sections/featured-programs";
import { SpeakingSection } from "@/components/sections/speaking-section";
import { ContentHighlights } from "@/components/sections/content-highlights";
import { InstagramCommunity } from "@/components/sections/instagram-community";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { FAQSection } from "@/components/sections/faq-section";
import { FinalCTA } from "@/components/sections/final-cta";

export default async function Home() {
  const repositories = getRepositories();
  const [settings, programs, speakingTopics, contentPosts, testimonials, faqItems] =
    await Promise.all([
      repositories.settings.get(),
      repositories.programs.list(),
      repositories.speaking.list(),
      repositories.contentPosts.list(),
      repositories.testimonials.list(),
      repositories.faq.list(),
    ]);

  const followersStat = settings.stats.find((stat) => stat.id === "followers");

  return (
    <>
      <HeroSection profile={settings.profile} followersStat={followersStat} />
      <AuthorityStrip stats={settings.stats} />
      <AboutSection profile={settings.profile} />
      <ExpertisePillars />
      <FeaturedPrograms programs={programs} />
      <SpeakingSection topics={speakingTopics} />
      <ContentHighlights posts={contentPosts} />
      <InstagramCommunity profile={settings.profile} settings={settings} />
      <TestimonialsSection testimonials={testimonials} />
      <FAQSection items={faqItems} />
      <FinalCTA />
    </>
  );
}
