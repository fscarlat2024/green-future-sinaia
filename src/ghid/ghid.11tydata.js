// Articolele din "Ghid Sinaia" (un fisier .md = un articol). Sunt in romana, pentru cautarile din Romania.
module.exports = {
  layout: "article.njk",
  lang: "ro",
  tags: ["ghid"],
  eleventyComputed: {
    permalink: (data) => `/ghid/${data.page.fileSlug}/`,
    title: (data) => data.seoTitle || `${data.titlu} | Green Future Sinaia`,
    description: (data) => data.rezumat,
    ogImage: (data) => data.imagine,
  },
};
