<script setup lang="ts">
import { computed } from 'vue'
import { useCatalog } from '../stores/catalog'
import { useUI } from '../stores/ui'
import HeroBanner from '../components/organisms/HeroBanner.vue'
import CategoryGrid from '../components/organisms/CategoryGrid.vue'
import ProductGrid from '../components/organisms/ProductGrid.vue'
import PromoGrid from '../components/organisms/PromoGrid.vue'
import FeatureStrip from '../components/organisms/FeatureStrip.vue'
import NewsletterForm from '../components/organisms/NewsletterForm.vue'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import InfoPanel from '../components/molecules/InfoPanel.vue'
import MarqueeStrip from '../components/molecules/MarqueeStrip.vue'
import DecorSprite from '../components/atoms/DecorSprite.vue'
import BonusTeaser from '../components/molecules/BonusTeaser.vue'
import ReviewsSection from '../components/organisms/ReviewsSection.vue'

const ui = useUI(), catalog = useCatalog()
const offers = computed(() => catalog.shopProducts.filter((p) => p.discount).slice(0, 5))
</script>

<template>
  <div>
    <HeroBanner @kebab="ui.openKebab()" />
    <MarqueeStrip :items="$t('marquee')" />
    <section class="wrap section has-decor">
      <DecorSprite side="right" top="-34px" />
      <SectionTitle>{{ $t('sections.categories') }}</SectionTitle>
      <CategoryGrid :categories="catalog.categories" />
    </section>
    <section class="wrap section has-decor">
      <DecorSprite side="left" bottom="-120px" :speed="0.18" />
      <SectionTitle :link="{ to: '/offers', label: $t('common.all') }">{{ $t('sections.offers') }}</SectionTitle>
      <ProductGrid :products="offers" scroll />
    </section>
    <section class="wrap section"><PromoGrid /></section>
    <section class="wrap section"><BonusTeaser /></section>
    <ReviewsSection />
    <section class="wrap section"><FeatureStrip /></section>
    <section v-reveal="'blur'" class="wrap section duo has-decor">
      <DecorSprite side="right" bottom="-90px" size="clamp(180px, 17vw, 280px)" :speed="0.1" />
      <InfoPanel :title="$t('teaser.title')">
        <p>{{ $t('teaser.text') }}</p>
        <RouterLink to="/about">{{ $t('teaser.link') }}</RouterLink>
      </InfoPanel>
      <NewsletterForm />
    </section>
  </div>
</template>
