// 创建连接
var connection = new JsStore.Connection(new Worker('./jsstore/jsstore.worker.js'))
connection.logStatus = false // 设置console日志打印

connection.on('open', db => {
  console.log('connection opened %O', db)
})
connection.on('create', db => {
  console.log('database created %O', db)
})
connection.on('upgrade', (database, oldVersion, newVersion) => {
  console.log('database is upgraded from %s to %s and database %O', oldVersion, newVersion, database)
})
// 请求队列清空事件
connection.on('requestQueueEmpty', () => {
  console.log('request queue is empty')
})
// 请求队列填充事件
connection.on('requestQueueFilled', () => {
  // 请求队列只要有一个请求，则触发事件
  console.log('request queue is filled')
})

// 中间件
const myMiddleware = function (request) {
  const query = request.query
  if (request.name === 'insert' && query.encrypt) { // 编码
    console.log('query %O', query)
  } else if (request.name === 'select' && query.decrypt) { // 解码
    request.onResult(result => {
      console.log('result %O', result)
      return result
    })
  }
}
// true表示中间件在worker线程中注册，默认false
connection.addMiddleware(myMiddleware, false)

// 插件
const MyPlugin = {
  setup(connection, params) {
    connection.myApi = {
      insertIntoMyTable(data) {
        return connection.insert({
          into: 'person',
          values: [data]
        })
      }
    }
  }
}
connection.addPlugin(MyPlugin)

window.onload = function () {
  initDb()
}

// 创建表
const tblPerson = {
  name: 'person',
  columns: {
    id: { primaryKey: true, autoIncrement: true },
    name: { notNull: true, dataType: 'string' },
    // id和name字段的多列索引，一般不建议使用，添加过多索引会增加数据库大小
    // select查询，如where: { id_name: [1, '我是昵称'] }
    id_name: { keyPath: ['id', 'name'] },
    age: { notNull: false, dataType: 'number', default: 1 },
    email: {
      notNull: true,
      unique: true,
      dataType: JsStore.DATA_TYPE.String,
      // multiEntry,
      // enableSearch,
      // keyPath
    },
    category_id: { dataType: 'number' }
  }
}
const tblArticle = {
  name: 'article',
  columns: {
    id: { primaryKey: true, dataType: 'number' },
    person_id: { dataType: 'number' },
    content: { dataType: 'string' }
  }
}
const tblCategory = {
  name: 'category',
  columns: {
    // 数据如果没有id字段，这里声明就会将id保存到数据中
    id: { primaryKey: true, autoIncrement: true },
    name: { dataType: 'string' },
    // indexedDB仅提供一级索引
    // 只支持数组元素为纯值的查询，如字符串、数字，而不支持对象和数组
    tags: { dataType: JsStore.DATA_TYPE.Array, multiEntry: true }
  },
  alter: {
    2: {
      modify: {},
      add: {
        create_at: {
          dataType: JsStore.DATA_TYPE.DateTime
        }
      },
      drop: {}
    }
  }
}

async function initDb() {
  const db = {
    name: 'test1',
    tables: [tblPerson, tblArticle, tblCategory],
    version: 3
  }
  var isDbCreated = await connection.initDb(db)
  // true表示数据库首次初始化成功，下次进来则返回false
  if (isDbCreated) {
    console.log('数据库创建成功，版本为%d', db.version)
  }
  else {
    console.log('数据库打开成功')
  }
}

// 返回数据库列表
async function getDbList() {
  const res = await connection.getDbList()
  res.forEach(item => {
    console.log(item)
  })
}

// 关闭连接
async function closeConnection() {
  await connection.terminate()
  console.log('数据库连接关闭成功')
}
// 打开连接
async function openConnection() {
  connection = new JsStore.Connection(new Worker('./jsstore/jsstore.worker.js'))
  initDb()
}

async function addPerson() {
  const values = [
    {
      id: 2,
      name: '张三',
      age: 24,
      email: 'linmingjie@example.com',
      category_id: 1
    }, {
      id: 1,
      name: '测试',
      age: null,
      email: 'test@example.com',
      category_id: 1
    }
  ]

  for (let i = 10; i > 0; i--) {
    values.push({
      id: i + 2,
      name: `我是昵称`,
      age: 20,
      email: `test${i + 2}@example.com`,
      category_id: 2
    })
  }

  var noOfRowsInserted = await connection.insert({
    into: 'person',
    return: false, // 是否返回已插入数据，默认为false
    upsert: false, // 如果数据存在，是否使用更新代替插入操作，默认为false
    // 是否校验数据，默认为true
    // 如果false，则跳过如数据类型，非空约束等，只检查与更新autoIncrement，default，唯一约束
    validation: true,
    // 是否跳过数据检查，如跳过数据类型，非空等
    // 对于没有任何约束地一次性插入批量数据非常有用，默认false
    skipDataCheck: false,
    // 发生错误时忽略错误记录，例如空值、数据类型不匹配、主键重复
    // 默认false，发生任何错误时，返回错误并终止整个事务
    ignore: true,
    values
  })
  if (noOfRowsInserted > 0) {
    console.log('数据插入成功', noOfRowsInserted)
  }

  await connection.insert({
    into: 'article',
    ignore: true,
    values: [
      { id: 1, person_id: 1, content: '我是文章1' },
      { id: 2, person_id: 1, content: '我是文章2' },
      { id: 3, person_id: 2, content: '我是文章3' },
      { id: 4, person_id: 2, content: '我是文章4' }
    ]
  })
  await connection.insert({
    into: 'category',
    values: [
      { id: 1, name: '我是类型1', create_at: new Date() },
      { id: 2, name: '我是类型2', create_at: new Date() },
      { id: 3, name: '我是类型3', create_at: new Date(), tags: ['JavaScript'] },
      { id: 4, name: '我是类型4', create_at: new Date(), tags: ['JavaScript', 'Node.js'] }
    ]
  })
}

async function select() {
  const res = await connection.select({
    from: 'person',
    // limit: 1, // 指定要返回的记录数
    // skip: 1 // 指定要跳过的记录数
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function orderBy() {
  const res = await connection.select({
    from: 'person',
    // order: {
    //   by: 'id',
    //   type: 'desc' // 默认升序，asc|desc
    // }
    order: [
      { by: 'id', type: 'desc', idbSorting: true },
      { by: 'name', type: 'asc' }
    ]
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function orderByWhenJoin() {
  await connection.select({
    from: 'person',
    join: {
      with: 'article',
      on: 'person.id=article.person_id'
    },
    order: { by: 'person.id', type: 'desc' }
  })
}

// 统计
// https://jsstore.net/tutorial/select/aggregate/
// select min(Column_Name) From Table_Name;
async function aggregate() {
  const res = await connection.select({
    from: 'person',
    aggregate: {
      min: 'age'
    }
  })
  console.log(res[0])
}

// 分组统计
async function groupBy() {
  const res = await connection.select({
    from: 'person',
    // groupBy: 'age'
    groupBy: ['name', 'age'],
    aggregate: {
      count: 'id'
    }
  })
  res.forEach(item => {
    console.log(item, item['count(id)'])
  })
}

async function distinct() {
  const res = await connection.select({
    from: 'person',
    // 返回唯一的结果集，默认false
    distinct: true
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function useCase() {
  const res = await connection.select({
    from: 'person',
    case: {
      age: [
        // 根据条件返回自定义值，数据库不会更新该值
        // 运算符有 =, >, >=, <, <=, !=
        { '=': 1, then: 11 },
        // null表示返回数据库的存储值
        { then: null }
      ]
    },
    // order: {
    //   by: 'name',
    //   case: [
    //     { '=': '张三', then: '1' }, // 将张三当做1时，张三将排在前面
    //     { then: null }
    //   ]
    // }
    order: {
      by: {
        name: [
          { '=': '我是昵称', then: 'email' }, // 按email字段排序
          { then: 'name' }
        ]
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function join() {
  const res = await connection.select({
    from: 'person',
    join: {
      with: 'article',
      on: 'person.id=article.person_id',
      type: 'inner', // inner, left
      as: {
        id: 'articleId'
      },
      where: {
        content: '我是文章2'
      },
      // order,
      // groupBy,
      // aggregate
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}

// join连接多张表
async function joinBetweenThreeTables() {
  const res = await connection.select({
    from: 'person',
    join: [
      {
        with: 'article',
        on: 'person.id=article.person_id',
        as: {
          id: 'articleId'
        }
      }, {
        with: 'category',
        on: 'category.id=person.category_id',
        as: {
          id: 'categoryId',
          name: 'categoryName'
        }
      }
    ]
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function useStore() {
  const persons = [
    { id: 1, name: '测试1', age: 1, email: 'test1@example.com' },
    { id: 2, name: '测试2', age: 1, email: 'test2@example.com' },
    { id: 3, name: '测试3', age: 2, email: 'test3@example.com' },
    { id: 4, name: '测试4', age: 2, email: 'test4@example.com' }
  ]
  const res = await connection.select({
    store: persons,
    order: {
      by: 'age',
      type: 'desc'
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function likeQuery() {
  const res = await connection.select({
    from: 'person',
    where: {
      name: {
        like: '我%'
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}
async function inQuery() {
  const res = await connection.select({
    from: 'person',
    where: {
      id: {
        in: [1, 2, 3]
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}
async function regexQuery() {
  const res = await connection.select({
    from: 'person',
    where: {
      email: {
        regex: /test\d@example\.com/
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}
async function orQuery() {
  // select * from person where id=1 or email="linmingjie@example.com" or name="测试"
  const res = await connection.select({
    from: 'person',
    where: {
      id: 1,
      or: {
        email: 'linmingjie@example.com',
        name: '测试'
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}
async function operatorQuery() {
  const res = await connection.select({
    from: 'person',
    where: {
      id: {
        // 支持 >, >=, <, <=, !=, -
        '>': 5,
        // between操作
        '-': {
          low: 6,
          high: 10
        }
      }
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}
// 高级SQL示例
async function advSQLExample1() {
  // select * from person where age=20 and (id=6 or email="test10@example.com")
  const res = await connection.select({
    from: 'person',
    where: [
      {
        age: 20
      }, {
        id: 6,
        or: {
          email: 'test10@example.com'
        }
      }
    ]
  })
  res.forEach(item => {
    console.log(item)
  })
}
async function advSQLExample2() {
  // select * from person where id=1 or (name="测试" and email="test10@example.com")
  const res = await connection.select({
    from: 'person',
    where: [
      {
        id: 1
      }, {
        or: {
          name: '测试',
          email: 'test10@example.com'
        }
      }
    ]
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function updateRow() {
  const noOfRowsUpdated = await connection.update({
    in: 'person',
    set: {
      name: '测试更新',
      // 支持 +, -, *, /, {data}（用于数组，相当于push操作）
      age: {
        '+': 99
      }
    },
    where: {
      id: 1
    }
  })
  console.log(`更新行数 ${noOfRowsUpdated}`)
}

async function countPerson() {
  const res = await connection.count({
    from: 'person'
  })
  console.log('person表的总记录数', res)
}

async function delPersonById() {
  const rowsDeleted = await connection.remove({
    from: 'person',
    where: {
      id: 5
    }
  })
  console.log(`删除行数 ${rowsDeleted}`)
}

async function clear2() {
  await connection.clear('category')
  console.log('成功删除category表的所有记录')
}
// 删除数据库
async function dropDb() {
  await connection.dropDb().then(() => {
    console.log('数据库删除成功')
  }).catch(error => {
    console.log('数据库删除失败 %O', error)
  })
}

// 联合union，合并多个查询结果
// 重复记录会进行去重
async function unionQuery() {
  const res = await connection.union([
    {
      from: 'person',
      where: {
        age: {
          '>': 10
        }
      }
    }, {
      from: 'person',
      where: {
        age: {
          '>': 20
        }
      }
    }
  ])
  res.forEach(item => {
    console.log(item)
  })
}

// 返回多个查询结果的交集
async function intersectQuery() {
  const res = await connection.intersect({
    queries: [
      {
        from: 'person',
        where: {
          age: {
            '>': 10
          }
        }
      }, {
        from: 'person',
        where: {
          age: {
            '>': 20
          }
        }
      }
    ]
  })
  res.forEach(item => {
    console.log(item)
  })
}

async function setter() {
  const userInfo = {
    name: '明杰',
    accountType: 'super_admin'
  }
  // 类似localStorage，支持二进制数据
  await connection.set('user_info', userInfo)
  console.log('设置成功')
}

async function getter() {
  const res = await connection.get('user_info')
  console.log(res)
}

async function importScripts() {
  // 这里的路径相对于jsstore.worker.js
  await connection.importScripts(
    '../import/bar.js',
    '../import/foo.js'
  )
}

// 事务
async function transaction() {
  await connection.importScripts('../import/transaction.js')

  const res = await connection.transaction({
    tables: ['person', 'article'],
    method: 'addPersonArticle',
    data: {
      person: {
        name: '绿茶',
        age: 18,
        email: 'lvcha@my.com'
      },
      article: {
        id: 1
      }
    }
  })
  console.log(res)
}

async function multiEntry() {
  const res = await connection.select({
    from: 'category',
    where: {
      tags: 'JavaScript'
    }
  })
  res.forEach(item => {
    console.log(item)
  })
}

// 中间件使用
async function middleware() {
  await connection.insert({
    into: 'person',
    values: [
      { name: '中间件测试', email: 'mymiddleware@example.com' }
    ],
    encrypt: true
  })

  const res = await connection.select({
    from: 'person',
    decrypt: true
  })
  res.forEach(item => {
    console.log(item)
  })
}

// 插件使用
async function plugin() {
  await connection.myApi.insertIntoMyTable({
    name: '插件测试',
    email: 'myplugin@example.com'
  })
}
