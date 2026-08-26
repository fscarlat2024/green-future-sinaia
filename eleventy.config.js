module.exports = function (eleventyConfig) {
  // Copiaza fisierele statice (imagini, css, admin) direct in output
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/well-known": ".well-known" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });

  // Colectii de apartamente, separate pe limba, ordonate dupa campul "order"
  const byOrder = (a, b) => (a.data.order || 99) - (b.data.order || 99);
  eleventyConfig.addCollection("apartmentsRo", (api) =>
    api.getFilteredByGlob("src/apartments/*.md").filter((i) => i.data.lang === "ro").sort(byOrder)
  );
  eleventyConfig.addCollection("apartmentsEn", (api) =>
    api.getFilteredByGlob("src/apartments/*.md").filter((i) => i.data.lang === "en").sort(byOrder)
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
