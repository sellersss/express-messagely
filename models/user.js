/** User class for message.ly */

const bcrypt = require('bcrypt');
const db = require('../db');
const ExpressError = require('../db');
const { BCRYPT_WORK_FACTOR } = require('../config');

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register(user) {
    const hashedPw = await bcrypt.hash(user.password, BCRYPT_WORK_FACTOR);
    const result = await db.query(`
      INSERT INTO users (
        username, 
        password, 
        first_name, 
        last_name, 
        phone, 
        join_at, 
        last_login_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPw, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(`
      SELECT password
      FROM users
      WHERE username = $1`,
      [username]
    );

    if (!result.rows[0]) {
      throw new ExpressError(`Username not found: ${username}`, 404);
    }
    const user = result.rows[0];
    const authRes = await bcrypt.compare(password, user.password);

    return authRes;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(`
      UPDATE users
      SET last_login_at = NOW()
      WHERE username = $1
      RETURNING last_login_at`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(`
      SELECT username, first_name, last_name, phone
      FROM users
      ORDER BY username DESC`);
    return result.rows[0];
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users WHERE username = $1`,
      [username]
    );

    if (!result.rows[0]) {
      throw new ExpressError(`Username not found: ${username}`, 404);
    }

    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(`
      SELECT 
        id, 
        to_username, 
        body, 
        sent_at, 
        read_at, 
        users.username, 
        users.first_name, 
        users.last_name, 
        users.phone
      FROM messages as m
        JOIN users AS u ON m.to_username = u.username
      WHERE from_username = $1`,
      [username]
    );

    let mapper = result.rows.map(row => {
      return {
        "body": row.body,
        to_user: {
          "first_name": row.first_name,
          "last_name": row.last_name,
          "phone": row.phone,
          "username": row.to_username,
        },
        "id": Number(row.id),
        "read_at": row.read_at,
        "sent_at": row.sent_at
      }
    });

    return mapper;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(`
      SELECT 
        m.id,
        u.first_name,
        u.last_name,
        u.phone
        m.from_username,
        m.body,
        m.sent_at,
        m.read_at,
      FROM messages as m
        JOIN users as u ON m.from_username = u.username
      WHERE to_username = $1`,
      [username]
    );

    let mapper = result.rows.map(row => {
      return {
        "body": row.body,
        from_user: {
          "first_name": row.first_name,
          "last_name": row.last_name,
          "phone": row.phone,
          "username": row.from_username,
        },
        "id": Number(row.id),
        "read_at": row.read_at,
        "sent_at": row.sent_at
      }
    });

    return mapper;
  }
}


module.exports = User;
