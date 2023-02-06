/*
数据库：IDBDatabase 对象
对象仓库：IDBObjectStore 对象
索引： IDBIndex 对象
事务： IDBTransaction 对象
操作请求：IDBRequest 对象
指针： IDBCursor 对象
主键集合：IDBKeyRange 对象
*/

// 打开数据库，返回一个 IDBOpenDBRequest 对象
// 版本号为整数，且不能小于之前的值
// 新建数据库时，默认为1，不传表示打开当前版本
// https://wangdoc.com/javascript/bom/indexeddb#indexeddbopen
const dbName = 'test';
const dbVersion = 8;
const dBOpenRequest = window.indexedDB.open(dbName, dbVersion)

// 数据库实例
let db

dBOpenRequest.onsuccess = function (event) {
  db = dBOpenRequest.result // IDBDatabase 对象
  console.log('数据库打开成功 %O', db)

  db.onabort = event => {
    console.log('数据库连接 >> 事务中止')
  }
  db.onclose = event => {
    console.log('数据库连接 >> 数据库意外关闭')
  }
  db.onerror = event => {
    console.log('数据库连接 >> 访问或操作数据库失败')
  }
  db.onversionchange = event => {
    // 调用deleteDatabase删除数据库，或发生upgradeneeded事件时触发
    console.log('数据库连接 >> 版本变化')
  }
}
dBOpenRequest.onerror = function (event) {
  console.log('数据库打开失败')
}
dBOpenRequest.onblocked = function (event) {
  // 上一次的数据库连接还未关闭
  // 数据库版本号更新时，如果仍有页面使用数据库，则导致当前页面的数据库打开和更新操作被阻塞
  // 数据库删除时的阻塞监听不到！！可能是删除数据库时遇到阻塞只会触发一次，刷新页面就不触发了
  console.log('数据库打开被阻塞')
}

dBOpenRequest.onupgradeneeded = function (event) {
  console.log('数据库版本更新')
  db = event.target.result // IDBDatabase 对象
  // 判断某个对象仓库是否存在
  if (!db.objectStoreNames.contains('person')) {
    // 创建存放数据的对象仓库，类似关系数据库的表，返回 IDBObjectStore 对象
    // 创建person表，主键为id
    // 主键也可以指定为下一层对象的属性，比如{ foo: { bar: 'baz' } }的foo.bar也可以指定为主键
    const objectStore = db.createObjectStore(
      'person',
      {
        // keyPath: 'id', // 主键路径，默认值为null
        autoIncrement: true // 是否使用自动递增的整数作为主键，例如1, 2, 3, ...，默认为false
        // 一般来说，keyPath和autoIncrement属性只要使用其一即可，如果一起使用，则表示主键必须为递增的整数
      }
    )
    // 索引名称，建立索引的属性，配置对象
    objectStore.createIndex('name', 'name', {
      unique: false, // 是否唯一索引
      multiEntry: false // 值为true时，对于有多个值的主键数组，每个值将在索引里面新建一个条目，否则主键数组对应一个条目
    })
    objectStore.createIndex('email', 'email', { unique: true })
    // https://codepen.io/ncortines/pen/pjvgJB?editors=0010
    objectStore.createIndex('name_email', ['name', 'email'])
    // 删除索引
    // IDBObjectStore.deleteIndex()
  }
  if (event.oldVersion < 2 && db.objectStoreNames.contains('store')) {
    // 删除指定的对象仓库
    db.deleteObjectStore('store')
  }
}

function write1() {
  // 创建数据库事务，返回 IDBTransaction 事务对象
  // 向数据库添加数据之前，必须先创建数据库事务
  // 事务的执行顺序是按照创建的顺序，而不是发出请求的顺序
  const transaction = db.transaction(['person'], 'readwrite') // 参数为表名、读写模式（readonly|readwrite，默认为readonly模式）
  const objectStore = transaction.objectStore('person') // 返回 IDBObjectStore 对象

  // 写入是一个异步操作，如果主键重复会报错，所以更新数据必须使用put方法
  // 返回 IDBRequest 对象
  objectStore.add({
    id: 2,
    name: '张三',
    age: 24,
    email: 'linmingjie@example.com'
  }, 2) // 第二个可选参数是主键，默认为null
  objectStore.add({
    id: 1,
    name: '测试',
    age: 20,
    email: 'test@example.com'
  }, 1)

  for (let i = 10; i > 0; i--) {
    objectStore.add({
      id: i + 2,
      name: `我是昵称`,
      age: 20,
      email: `test${i + 2}@example.com`
    }, i + 2)
  }

  // 终止当前事务，回滚所有已进行的变更
  // transaction.abort()

  transaction.oncomplete = e => {
    console.log('写入事务成功')
  }
  transaction.onabort = e => {
    console.log('写入事务中断')
  }
  transaction.onerror = function (event) {
    console.log('写入事务失败')
  }
}

function read() {
  // 返回 IDBTransaction 事务对象
  const transaction = db.transaction(['person'])
  const objectStore = transaction.objectStore('person')
  console.log('objectStore  %O', objectStore)
  // 通过主键查找记录
  const objectStoreRequest = objectStore.get(1)
  // IDBObjectStore.getKey()
  // IDBObjectStore.get()
  // IDBObjectStore.getAll(query, count?)
  // IDBObjectStore.getAllKeys()

  // 比较主键大小
  // 返回一个整数，表示比较的结果：0表示相同，1表示第一个主键大于第二个主键，-1表示第一个主键小于第二个主键
  window.indexedDB.cmp(1, 2) // -1

  objectStoreRequest.onsuccess = function (event) {
    const res = objectStoreRequest.result
    if (res) {
      console.log(`ID：${res.id}\t名字：${res.name}\t年龄：${res.age}岁\t邮箱：${res.email}\n`)
    } else {
      console.log('暂无数据')
    }
  }
  objectStoreRequest.onerror = function (event) {
    console.log('获取失败')
  }
}

// 读取所有记录
function readAll() {
  const objectStore = db.transaction('person', 'readwrite').objectStore('person')
  // 第一个参数是主键值，或者一个 IDBKeyRange 对象，如果省略，将处理所有的记录
  // 第二个参数，表示遍历方向，默认值为next，其他可能的值为prev、nextunique和prevunique，后两个值表示如果有重复值，则自动跳过
  // 返回 IDBCursor 指针对象
  objectStore.openCursor().onsuccess = function (event) {
    const cursor = event.target.result
    if (cursor) {
      const res = cursor.value
      console.log(`Key：${cursor.key}\tID：${res.id}\t名字：${res.name}\t年龄：${res.age}岁\t邮箱：${res.email}\n`)

      // cursor.delete() // 删除当前位置的记录，返回 IDBRequest 对象
      cursor.update({ ...res, name: '指针的修改' }) // 更新当前位置的记录，返回 IDBRequest 对象

      // 指针指向下一个数据对象，如果当前已经是最后一条数据，则指向null
      cursor.continue() // 指针向前移动 1 个位置
      // cursor.advance(2) // 指针向前移动 n 个位置
    } else {
      console.log('没有更多数据了~')
    }
  }
  // objectStore.openKeyCursor
}

function getKeyRange() {
  // 返回 IDBKeyRange 对象

  // 指定下限值，默认包括端点值
  IDBKeyRange.lowerBound('a') // ≥ a
  IDBKeyRange.lowerBound('a', true) // > a
  // 指定上限值
  IDBKeyRange.upperBound('z') // ≤ z
  IDBKeyRange.upperBound('z', true) // < z
  // 指定上下限值
  IDBKeyRange.bound('a', 'z') // ≥ a && ≤ z
  IDBKeyRange.bound('a', 'z', true, true) // > x && < y
  IDBKeyRange.bound('a', 'z', true, false) // > x && ≤ y
  IDBKeyRange.bound('a', 'z', false, true) // ≥ x && < y
  // 指定具体值
  IDBKeyRange.only('f') // = f

  const range = IDBKeyRange.bound(1, 10)
  console.log('是否在1~10之间', range.includes(5))
  db.transaction(['person'], 'readonly')
    .objectStore('person')
    .openCursor(range)
    .onsuccess = function (e) {
      const cursor = e.target.result
      if (cursor) {
        console.log(cursor.value)
        cursor.continue()
      } else {
        console.log('没有更多数据了~')
      }
    }
}

function getAll() {
  const range = IDBKeyRange.bound(5, 20)
  const objectStoreRequest = db.transaction(['person'], 'readonly')
    .objectStore('person')
    // 第一个参数为主键或 IDBKeyRange，第二个参数为获取的记录数
    // 输出 id在5到10之间 的前5条记录
    .getAll(range, 5)

  objectStoreRequest.onsuccess = function (event) {
    const res = event.target.result
    res.forEach(item => {
      console.log(item)
    })
  }
}

// 更新记录
function update() {
  const request = db.transaction(['person'], 'readwrite')
    .objectStore('person')
    // 更新主键的记录，如果没有定义主键，则会新增记录
    // 返回 IDBRequest 对象
    .put({
      id: '1',
      name: '嘟宝',
      age: 29,
      email: 'dubao@pcitech.com'
    }, 2) // 第二个可选参数为主键

  request.onsuccess = function (event) {
    console.log('数据更新成功')
  }
  request.onerror = function (event) {
    console.log('数据更新失败')
  }
}

// 删除当前对象仓库的所有记录
function clear1() {
  db.transaction(['person'], 'readwrite')
    .objectStore('person')
    .clear()
}

function remove() {
  const request = db.transaction(['person'], 'readwrite')
    .objectStore('person')
    // 删除指定主键的记录，如果没有该主键记录，也会删除成功，只是影响0条记录
    .delete(2)

  request.onsuccess = function (event) {
    console.log('数据删除成功')
  }
}

function count() {
  const objectStore = db.transaction(['person'], 'readwrite')
    .objectStore('person')

  objectStore.count().onsuccess = function (event) {
    console.log('当前对象仓库的所有记录数', event.target.result)
  }
  // 如果主键或 IDBKeyRange 对象作为参数，则返回对应的记录数
  objectStore.count(2).onsuccess = function (event) {
    console.log('指定主键的记录数', event.target.result)
  }
}

function useIndex() {
  const transaction = db.transaction(['person'], 'readonly')
  const store = transaction.objectStore('person')
  // 创建表时，对email字段建立索引之后，可以通过email字段，查找记录
  // 如果不是唯一索引，有可能取回多个数据对象
  // 返回指定名称的索引对象 IDBIndex
  const index = store.index('email')
  console.log('index %O', index)

  index.openCursor().onsuccess = function (event) {
    const cursor = event.target.result
    if (cursor) {
      console.log(cursor.value)
      cursor.continue()
    } else {
      console.log('没有更多数据了~')
    }
  }

  const request = index.get('admin@example.com')
  request.onsuccess = function (e) {
    const result = e.target.result
    if (result) {
      console.log('result %O', result)
    } else {
      console.log('查无结果~~')
    }
  }

  transaction.oncomplete = e => {
    console.log('事务成功')
  }
  transaction.onabort = e => {
    console.log('事务中断')
  }
  transaction.onerror = function (event) {
    console.log('事务失败')
  }
}

function closeDatabase() {
  // 关闭数据库连接，实际会等所有事务完成后再关闭
  db.close()
  console.log('数据库关闭成功')
}

// 删除数据库
function deleteDatabase() {
  // 删除不存在的数据库并不会报错
  // 调用deleteDatabase()方法以后，当前数据库的其他已经打开的连接都会接收到IDBDatabase.onversionchange事件
  // 返回 IDBOpenDBRequest 对象
  const dBDeleteRequest = window.indexedDB.deleteDatabase('test')
  console.log('dBDeleteRequest %O', dBDeleteRequest)
  // 如果为done就表示操作完成，可能成功也可能失败
  console.log(dBDeleteRequest.readyState === 'pending' ? '数据库正在删除中' : '')

  dBDeleteRequest.onerror = function (event) {
    console.log('数据库删除失败')
  }
  dBDeleteRequest.onsuccess = function (event) {
    console.log('数据库删除成功')
  }
  dBDeleteRequest.onblocked = function (event) {
    // 被阻塞，其他tab页面刷新时，将打不开此数据库，要等到不阻塞才触发数据库open时的success成功事件
    console.log('数据库删除 -- 数据库仍在使用，删除操作被阻塞')
  }
}
