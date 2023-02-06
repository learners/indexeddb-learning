async function addPersonArticle(ctx) {
  ctx.start() // 开启事务

  const insertedPerson = await ctx.insert({
    into: 'person',
    values: [ctx.data.person],
    return: true
  })
  const person = insertedPerson[0]

  const articleId = ctx.data.article.id
  const articleUpdated = await ctx.update({
    in: 'article',
    where: {
      id: articleId
    },
    set: {
      person_id: person.id
    }
  })
  if (articleUpdated > 0) {
    const articles = await ctx.select({
      from: 'article',
      where: {
        id: articleId
      }
    })
    ctx.setResult('person', person)
    ctx.setResult('article', articles[0])
  } else {
    // 终止事务
    ctx.abort('找不到 id 为 %s 的文章', articleId)
  }
}
