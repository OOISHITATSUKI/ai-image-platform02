'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useState } from 'react';
import styles from './page.module.css';
import BlogNav from '@/components/blog/BlogNav';

const ldJsonArticle = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Write NSFW AI Prompts: Complete Guide for Realistic Results',
  datePublished: '2025-03-13',
  dateModified: '2026-04-30',
  author: { '@type': 'Organization', name: 'Image Nude' },
  publisher: { '@type': 'Organization', name: 'Image Nude', url: 'https://imagenude.com', logo: { '@type': 'ImageObject', url: 'https://imagenude.com/logo.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://imagenude.com/blog/how-to-write-nsfw-ai-prompts' },
};

const ldJsonFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What makes a good NSFW AI prompt?',
      acceptedAnswer: { '@type': 'Answer', text: 'A good NSFW AI prompt combines a clear subject description, physical appearance details, pose or action, setting, lighting, and quality tags. The more specific and descriptive, the better the result.' },
    },
    {
      '@type': 'Question',
      name: 'What are negative prompts in AI image generation?',
      acceptedAnswer: { '@type': 'Answer', text: 'Negative prompts tell the AI what NOT to generate. They are used to avoid common artifacts like deformed anatomy, extra fingers, blurry results, or unwanted styles. Always include a strong negative prompt for best results.' },
    },
    {
      '@type': 'Question',
      name: 'How long should a NSFW AI prompt be?',
      acceptedAnswer: { '@type': 'Answer', text: 'A good NSFW prompt is typically 30\u201380 words. Too short and the AI guesses what you want; too long and important details get lost. Focus on the most important elements: subject, appearance, pose, setting, and quality tags.' },
    },
    {
      '@type': 'Question',
      name: 'Why does my AI image look unrealistic?',
      acceptedAnswer: { '@type': 'Answer', text: 'The most common causes are: missing quality tags (add "photorealistic, 8k uhd, RAW photo"), no negative prompt (add deformed anatomy, cartoon, etc.), or a vague subject description. Improving these three things solves most realism issues.' },
    },
  ],
};

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <div className={styles.faqQ} onClick={() => setOpen(!open)}>
        {question} <span>{open ? '\u2212' : '+'}</span>
      </div>
      {open && <div className={styles.faqA}>{answer}</div>}
    </div>
  );
}

export default function HowToWriteNsfwAiPromptsPage() {
  return (
    <>
      <Script
        id="ld-json-nsfw-prompts-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonArticle) }}
      />
      <Script
        id="ld-json-nsfw-prompts-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonFaq) }}
      />
      <div className={styles.root}>
        {/* Nav */}
        <BlogNav />

        <div className={styles.wrap}>
          {/* Article */}
          <article className={styles.article}>

            <div className={styles.meta}>
              <span className={styles.tag}>Guide</span>
              <span className={styles.metaInfo}>April 2026 &middot; 10 min read</span>
            </div>

            <h1 className={styles.h1}>How to Write NSFW AI Prompts: Complete Guide for Realistic Results</h1>

            <p className={styles.lede}>
              The difference between a mediocre AI image and a photorealistic one comes down almost entirely to how you write your prompt. This guide covers everything &mdash; from basic structure to advanced techniques used by experienced generators.
            </p>

            {/* Basics */}
            <h2 id="basics">The Basics: How AI Prompts Work</h2>
            <p>An AI image prompt is a text description that tells the model what to generate. The AI doesn&apos;t &ldquo;understand&rdquo; language the way a human does &mdash; it matches your words to patterns learned from millions of images during training. If you&apos;re new to the whole process, our <Link href="/blog/how-to-generate-nsfw-ai-images">beginner&apos;s guide to generating NSFW AI images</Link> covers the end-to-end workflow before you dive into prompt specifics.</p>
            <p>This means <strong>specificity is everything</strong>. Vague prompts produce vague results. The more precisely you describe what you want &mdash; appearance, pose, lighting, style &mdash; the closer the output will match your vision.</p>
            <p>Most NSFW AI platforms also support <strong>negative prompts</strong> &mdash; a separate field where you list things you don&apos;t want in the image. Used correctly, negative prompts dramatically reduce unwanted artifacts and improve consistency.</p>

            {/* Formula */}
            <h2 id="formula">The Prompt Formula</h2>
            <p>Every strong NSFW prompt follows the same basic structure:</p>

            <div className={styles.formula}>
              <div className={styles.formulaTitle}>The Prompt Formula</div>
              <div className={styles.formulaParts}>
                <span className={styles.formulaPart}>Subject</span>
                <span className={styles.formulaPlus}>+</span>
                <span className={styles.formulaPart}>Physical Appearance</span>
                <span className={styles.formulaPlus}>+</span>
                <span className={styles.formulaPart}>Pose / Action</span>
                <span className={styles.formulaPlus}>+</span>
                <span className={styles.formulaPart}>Setting</span>
                <span className={styles.formulaPlus}>+</span>
                <span className={styles.formulaPart}>Lighting</span>
                <span className={styles.formulaPlus}>+</span>
                <span className={styles.formulaPart}>Quality Tags</span>
              </div>
            </div>

            <p>Each element adds information that guides the AI toward the result you want. Leaving any element out forces the AI to guess &mdash; and its guesses are rarely what you had in mind.</p>

            {/* Weak vs Strong */}
            <h2 id="weak-vs-strong">Weak vs. Strong Prompts</h2>

            <div className={styles.compare}>
              <div className={`${styles.compareCol} ${styles.colBad}`}>
                <h4>Weak Prompt</h4>
                <div className={styles.promptBox} style={{ margin: 0, fontSize: '13px' }}>
                  beautiful woman, naked, bedroom
                </div>
              </div>
              <div className={`${styles.compareCol} ${styles.colGood}`}>
                <h4>Strong Prompt</h4>
                <div className={styles.promptBox} style={{ margin: 0, fontSize: '13px' }}>
                  beautiful Japanese woman, 25 years old, long black hair, slender figure, lying on white silk sheets, soft morning light from window, photorealistic, 8k uhd, detailed skin texture
                </div>
              </div>
            </div>

            <p>The weak prompt gives the AI almost no information. The strong prompt specifies ethnicity, age, hair, body type, pose, setting, lighting, and quality level &mdash; every detail that shapes the final image.</p>

            {/* 1. Subject */}
            <h2 id="subject">1. Describing the Subject</h2>
            <p>Start with the person. The most important descriptors are:</p>
            <ul>
              <li><strong>Age:</strong> &ldquo;25-year-old&rdquo;, &ldquo;young adult&rdquo;, &ldquo;mature woman&rdquo; &mdash; be specific</li>
              <li><strong>Ethnicity:</strong> &ldquo;Japanese&rdquo;, &ldquo;European&rdquo;, &ldquo;Latina&rdquo;, &ldquo;mixed heritage&rdquo;</li>
              <li><strong>Hair:</strong> color, length, style &mdash; &ldquo;long wavy auburn hair&rdquo;, &ldquo;short black bob&rdquo;</li>
              <li><strong>Body type:</strong> &ldquo;slender&rdquo;, &ldquo;athletic&rdquo;, &ldquo;curvy&rdquo;, &ldquo;petite&rdquo;</li>
              <li><strong>Facial features:</strong> &ldquo;almond eyes&rdquo;, &ldquo;full lips&rdquo;, &ldquo;high cheekbones&rdquo;</li>
            </ul>

            <div className={styles.promptBox}>
              <span className={styles.promptLabel}>Subject Example</span>
              beautiful Korean woman, 24 years old, shoulder-length straight black hair, slim athletic figure, large expressive dark eyes, natural makeup
            </div>

            {/* 2. Pose */}
            <h2 id="pose">2. Pose and Action</h2>
            <p>Describe exactly what the subject is doing and how she&apos;s positioned. The AI needs this information to compose the image correctly.</p>
            <ul>
              <li>&ldquo;lying on her back&rdquo;, &ldquo;sitting cross-legged&rdquo;, &ldquo;standing facing camera&rdquo;</li>
              <li>&ldquo;looking directly at camera&rdquo;, &ldquo;gazing away&rdquo;, &ldquo;eyes closed&rdquo;</li>
              <li>&ldquo;arms raised&rdquo;, &ldquo;hands on hips&rdquo;, &ldquo;one knee raised&rdquo;</li>
            </ul>

            <div className={styles.promptBox}>
              <span className={styles.promptLabel}>Pose Examples</span>
              lying on her side facing camera, one arm raised above head, legs slightly bent, relaxed expression<br /><br />
              sitting on edge of bed, leaning forward slightly, looking at camera with soft smile<br /><br />
              standing in shower, head tilted back, water running over shoulders
            </div>

            {/* 3. Setting */}
            <h2 id="setting">3. Setting and Background</h2>
            <p>The setting establishes context and affects how the whole image feels. Be specific:</p>
            <ul>
              <li><strong>Interior:</strong> &ldquo;modern bedroom&rdquo;, &ldquo;luxury hotel room&rdquo;, &ldquo;Japanese-style bathroom&rdquo;, &ldquo;minimalist white studio&rdquo;</li>
              <li><strong>Exterior:</strong> &ldquo;private beach at sunset&rdquo;, &ldquo;rooftop terrace at night&rdquo;, &ldquo;tropical garden&rdquo;</li>
              <li><strong>Abstract:</strong> &ldquo;simple white background&rdquo;, &ldquo;dark gradient background&rdquo;, &ldquo;bokeh background&rdquo;</li>
            </ul>

            <div className={styles.tip}>
              <p><strong>Tip:</strong> Simple or neutral backgrounds (white, gradient, bokeh) tend to produce cleaner results than complex scenes. If the setting isn&apos;t important to you, use &ldquo;simple background&rdquo; or &ldquo;bokeh background&rdquo; to keep the focus on the subject.</p>
            </div>

            {/* 4. Lighting */}
            <h2 id="lighting">4. Lighting</h2>
            <p>Lighting is one of the most underused elements in NSFW prompts &mdash; but it has an enormous impact on realism. Specify it every time.</p>
            <ul>
              <li><strong>Natural:</strong> &ldquo;soft morning light&rdquo;, &ldquo;golden hour sunlight&rdquo;, &ldquo;overcast natural light&rdquo;</li>
              <li><strong>Artificial:</strong> &ldquo;studio lighting&rdquo;, &ldquo;ring light&rdquo;, &ldquo;warm lamp light&rdquo;, &ldquo;neon glow&rdquo;</li>
              <li><strong>Directional:</strong> &ldquo;side lighting&rdquo;, &ldquo;backlit&rdquo;, &ldquo;front-lit&rdquo;, &ldquo;dramatic shadows&rdquo;</li>
            </ul>

            <div className={styles.promptBox}>
              <span className={styles.promptLabel}>Lighting Examples</span>
              soft diffused window light, warm morning glow, gentle shadows<br /><br />
              dramatic studio lighting, strong shadows, high contrast<br /><br />
              warm candlelight, intimate low-key lighting, golden tones
            </div>

            {/* 5. Quality Tags */}
            <h2 id="quality-tags">5. Quality Tags</h2>
            <p>Quality tags are short keywords that tell the AI to produce high-resolution, detailed, realistic output. Always add these at the end of your prompt:</p>

            <div className={styles.tagsGrid}>
              <div className={styles.tagChip}>photorealistic</div>
              <div className={styles.tagChip}>8k uhd</div>
              <div className={styles.tagChip}>masterpiece</div>
              <div className={styles.tagChip}>best quality</div>
              <div className={styles.tagChip}>RAW photo</div>
              <div className={styles.tagChip}>detailed skin</div>
              <div className={styles.tagChip}>sharp focus</div>
              <div className={styles.tagChip}>professional</div>
              <div className={styles.tagChip}>hyperrealistic</div>
            </div>

            <div className={styles.promptBox}>
              <span className={styles.promptLabel}>Full Quality Tag String</span>
              photorealistic, RAW photo, 8k uhd, masterpiece, best quality, detailed skin texture, sharp focus, professional photography, hyperrealistic
            </div>

            {/* 6. Negative Prompts */}
            <h2 id="negative-prompts">6. Negative Prompts</h2>
            <p>Negative prompts are just as important as positive ones. They prevent the AI from generating common artifacts &mdash; deformed anatomy, extra fingers, cartoon-like results, and low quality outputs.</p>
            <p>Always use a strong negative prompt:</p>

            <div className={`${styles.promptBox} ${styles.promptNeg}`}>
              <span className={styles.promptLabel}>Standard Negative Prompt</span>
              deformed, bad anatomy, ugly, blurry, low quality, watermark, text, signature, extra fingers, extra limbs, missing limbs, fused fingers, too many fingers, cartoon, anime, illustration, painting, drawing, sketch, 3d render, cgi, plastic skin, overexposed, underexposed
            </div>

            <div className={styles.tip}>
              <p><strong>Tip:</strong> Image Nude applies optimized negative prompts automatically when you use style presets. If you&apos;re writing custom prompts, copy the negative prompt above and use it as your starting point every time.</p>
            </div>

            {/* Templates */}
            <h2 id="templates">Ready-to-Use Prompt Templates</h2>
            <p>Copy these templates and modify the details to match what you want.</p>

            <div className={styles.templateCard}>
              <div className={styles.templateTitle}>Indoor &mdash; Bedroom Scene</div>
              <div className={styles.promptBox} style={{ marginBottom: '12px' }}>
                <span className={styles.promptLabel}>Positive</span>
                beautiful [ethnicity] woman, [age] years old, [hair description], [body type], lying on [bed type], wearing [clothing or nothing], [expression], soft [lighting type] light, luxury bedroom interior, photorealistic, 8k uhd, masterpiece, detailed skin texture, sharp focus
              </div>
              <div className={`${styles.promptBox} ${styles.promptNeg}`}>
                <span className={styles.promptLabel}>Negative</span>
                deformed, bad anatomy, ugly, blurry, low quality, watermark, extra fingers, cartoon, anime, painting, sketch
              </div>
            </div>

            <div className={styles.templateCard}>
              <div className={styles.templateTitle}>Bathroom / Shower Scene</div>
              <div className={styles.promptBox} style={{ marginBottom: '12px' }}>
                <span className={styles.promptLabel}>Positive</span>
                beautiful [ethnicity] woman, [age], [hair description], [body type], standing in [modern / glass / marble] shower, water droplets on skin, steam, [expression], natural diffused light, photorealistic, RAW photo, 8k uhd, best quality, hyperrealistic skin
              </div>
              <div className={`${styles.promptBox} ${styles.promptNeg}`}>
                <span className={styles.promptLabel}>Negative</span>
                deformed, bad anatomy, blurry, low quality, watermark, extra limbs, cartoon, cgi, plastic skin
              </div>
            </div>

            <div className={styles.templateCard}>
              <div className={styles.templateTitle}>Outdoor &mdash; Natural Setting</div>
              <div className={styles.promptBox} style={{ marginBottom: '12px' }}>
                <span className={styles.promptLabel}>Positive</span>
                beautiful [ethnicity] woman, [age], [hair description], [body type], [pose] on [beach / rooftop / garden], golden hour sunlight, warm tones, [expression], photorealistic, 8k, masterpiece, professional photography, bokeh background, sharp focus
              </div>
              <div className={`${styles.promptBox} ${styles.promptNeg}`}>
                <span className={styles.promptLabel}>Negative</span>
                deformed, bad anatomy, ugly, overexposed, blurry, watermark, extra fingers, cartoon, painting
              </div>
            </div>

            {/* Advanced */}
            <h2 id="advanced">Advanced Techniques</h2>

            <h3>Use Parentheses for Emphasis</h3>
            <p>Many AI platforms support weighted prompts. Wrapping words in parentheses increases their influence on the generation:</p>

            <div className={styles.promptBox}>
              (photorealistic:1.4), (detailed skin texture:1.3), beautiful Japanese woman, 25 years old
            </div>

            <h3>Style Keywords</h3>
            <p>Add a photography or style reference to anchor the visual aesthetic. The exact keywords that work best depend on the model you&apos;re using &mdash; our <Link href="/blog/stable-diffusion-nsfw-guide">Stable Diffusion NSFW guide</Link> covers model-specific settings in more detail:</p>

            <div className={styles.promptBox}>
              shot on Sony A7R, 85mm lens, shallow depth of field, magazine photography style<br /><br />
              editorial photography, Vogue lighting, professional model pose<br /><br />
              intimate photography, candid style, natural unposed
            </div>

            <h3>Skin Texture Details</h3>
            <p>For maximum realism, add specific skin detail tags:</p>

            <div className={styles.promptBox}>
              realistic skin pores, subsurface scattering, natural skin imperfections, soft skin texture, lifelike
            </div>

            {/* FAQ */}
            <h2 id="faq">Frequently Asked Questions</h2>

            <FaqItem
              question="What makes a good NSFW AI prompt?"
              answer="A good NSFW AI prompt combines a clear subject description, physical appearance details, pose or action, setting, lighting, and quality tags. The more specific and descriptive, the better the result."
            />
            <FaqItem
              question="What are negative prompts in AI image generation?"
              answer="Negative prompts tell the AI what NOT to generate. They are used to avoid common artifacts like deformed anatomy, extra fingers, blurry results, or unwanted styles. Always include a strong negative prompt for best results."
            />
            <FaqItem
              question="How long should a NSFW AI prompt be?"
              answer="A good NSFW prompt is typically 30\u201380 words. Too short and the AI guesses what you want; too long and important details get lost. Focus on the most important elements: subject, appearance, pose, setting, and quality tags."
            />
            <FaqItem
              question="Why does my AI image look unrealistic?"
              answer='The most common causes are: missing quality tags (add "photorealistic, 8k uhd, RAW photo"), no negative prompt (add deformed anatomy, cartoon, etc.), or a vague subject description. Improving these three things solves most realism issues.'
            />

            {/* CTA */}
            <div className={styles.ctaBlock}>
              <h3>Put These Prompts to Work</h3>
              <p>Try your prompts on Image Nude. 20 free credits on signup &mdash; no credit card required.</p>
              <Link href="/register" className={styles.ctaBtn}>Start Free &mdash; 20 Credits &rarr;</Link>
              <p className={styles.ctaNote}>18+ only &middot; All content AI-generated &middot; Images deleted within 1 hour</p>
              <p style={{ marginTop: 12, fontSize: 13 }}>Try: <Link href="/undress-ai">Free AI undress tool</Link> &middot; <Link href="/face-swap">AI face swap</Link> &middot; <Link href="/blog/best-ai-undress-tools">Compare all tools</Link></p>
            </div>

          </article>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.toc}>
              <h4 className={styles.tocTitle}>Contents</h4>
              <ol>
                <li><a href="#basics">How Prompts Work</a></li>
                <li><a href="#formula">The Prompt Formula</a></li>
                <li><a href="#subject">1. Subject</a></li>
                <li><a href="#pose">2. Pose &amp; Action</a></li>
                <li><a href="#setting">3. Setting</a></li>
                <li><a href="#lighting">4. Lighting</a></li>
                <li><a href="#quality-tags">5. Quality Tags</a></li>
                <li><a href="#negative-prompts">6. Negative Prompts</a></li>
                <li><a href="#templates">Templates</a></li>
                <li><a href="#advanced">Advanced Tips</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ol>
            </div>
            <div className={styles.scta}>
              <h4 className={styles.sctaTitle}>Try Your Prompts Free</h4>
              <p>20 credits on signup. No credit card needed.</p>
              <Link href="/register" className={styles.sctaLink}>Start Free &rarr;</Link>
              <p className={styles.sctaNote}>No credit card &middot; 18+</p>
            </div>
            <div className={styles.related}>
              <h4 className={styles.relatedTitle}>Related Articles</h4>
              <ul>
                <li><Link href="/blog/how-to-generate-nsfw-ai-images">How to Generate NSFW AI Images</Link></li>
                <li><Link href="/blog/how-to-create-consistent-ai-character">Create a Consistent AI Character</Link></li>
                <li><Link href="/blog/best-ai-undress-tools">Best AI Undress Tools 2026</Link></li>
                <li><Link href="/blog/ai-face-swap-adults">Best NSFW Face Swap Tools</Link></li>
              </ul>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>&copy; 2025 Image Nude &middot; <Link href="/privacy">Privacy</Link> &middot; <Link href="/terms">Terms</Link> &middot; 18+ Only</p>
        </footer>
      </div>
    </>
  );
}
