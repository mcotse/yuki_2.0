import oracledb from 'oracledb'

// Fetch CLOBs as strings to avoid circular reference issues
oracledb.fetchAsString = [oracledb.CLOB]

let pool: oracledb.Pool | null = null

export async function initializePool(): Promise<void> {
  // TLS-only connection string (port 1521, no wallet required)
  const connectString = '(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.us-sanjose-1.oraclecloud.com))(connect_data=(service_name=g544679362d9b4e_yukidb_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))'

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER || 'ADMIN',
    password: process.env.ORACLE_PASSWORD,
    connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    queueTimeout: 120000,
  })

  console.log('Oracle connection pool initialized (TLS mode)')
}

export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    throw new Error('Database pool not initialized')
  }
  return pool.getConnection()
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(0)
    pool = null
    console.log('Oracle connection pool closed')
  }
}

export async function executeQuery<T>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<T[]> {
  const connection = await getConnection()
  try {
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options,
    })
    return (result.rows || []) as T[]
  } finally {
    await connection.close()
  }
}

export async function executeStatement(
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<oracledb.Result<unknown>> {
  const connection = await getConnection()
  try {
    const result = await connection.execute(sql, binds, { autoCommit: true })
    return result
  } finally {
    await connection.close()
  }
}
