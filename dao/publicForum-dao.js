const db = require("../startup/database");

// exports.getPaginatedPosts = (limit, offset) => {
//   return new Promise((resolve, reject) => {
//     const sql = `
//             SELECT 
//                 p.id,
//                 p.userId,
//                 p.heading,
//                 p.message,
//                 p.postimage,
//                 p.createdAt,
//                 COUNT(r.chatId) AS replyCount 
//             FROM 
//                 publicforumposts p 
//             LEFT JOIN 
//                 publicforumreplies r ON p.id = r.chatId 
//             GROUP BY 
//                 p.id 
//             ORDER BY 
//                 p.createdAt DESC
//             LIMIT ? OFFSET ?;
//         `;
//     db.plantcare.query(sql, [limit, offset], (err, results) => {
//       if (err) {
//         reject(err);
//       } else {
//         const posts = results.map((post) => ({
//           ...post,
//           postimage: post.postimage ? post.postimage.toString("base64") : null,
//         }));
//         resolve(posts);
//       }
//     });
//   });
// };
exports.getPaginatedPosts = (limit, offset) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        p.id,
        p.userId,
        p.staffId,
        p.heading,
        p.message,
        p.postimage,
        p.createdAt,
        COUNT(r.chatId) AS replyCount,
COALESCE(
          CONCAT(
            CASE 
              WHEN p.staffId IS NOT NULL THEN CONCAT(s.firstName, ' ', s.lastName)
              ELSE CONCAT(u.firstName, ' ', u.lastName)
            END
          )
        ) AS userName
       FROM 
        publicforumposts p
      LEFT JOIN 
        publicforumreplies r ON p.id = r.chatId
      LEFT JOIN
        users u ON p.userId = u.id
      LEFT JOIN
        farmstaff s ON p.staffId = s.id
      GROUP BY 
        p.id, u.firstName, u.lastName, s.firstName, s.lastName
      ORDER BY 
        p.createdAt DESC
      LIMIT ? OFFSET ?;
    `;
    db.plantcare.query(sql, [limit, offset], (err, results) => {
      if (err) {
        reject(err);
      } else {
        const posts = results.map((post) => ({
          ...post,
          postimage: post.postimage ? post.postimage.toString("base64") : null,
        }));
        resolve(posts);
      }
    });
  });
};



exports.getTotalPostsCount = () => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT COUNT(*) AS total FROM publicforumposts;`;
    db.plantcare.query(sql, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0].total);
      }
    });
  });
};

// exports.getRepliesByChatId = (chatId) => {
//   return new Promise((resolve, reject) => {
//     const sql = `
//             SELECT 
//                 r.replyId, 
//                 r.replyMessage, 
//                 r.createdAt, 
//                 u.firstName AS userName 
//             FROM 
//                 publicforumreplies r
//             JOIN 
//                 publicforumposts p ON r.chatId = p.id
//             JOIN 
//                 users u ON r.replyId = u.id
//             WHERE 
//                 r.chatId = ?
//             ORDER BY 
//                 r.createdAt DESC
//         `;
//     db.plantcare.query(sql, [chatId], (err, results) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(results);
//         console.log(results);
//       }
//     });
//   });
// };
// exports.getRepliesByChatId = (chatId) => {
//   return new Promise((resolve, reject) => {
//     const sql = `
//             SELECT 
//                 r.replyId, 
//                 r.replyMessage, 
//                 r.createdAt, 
//                 IFNULL(u.firstName, 'Admin') AS userName  -- If replyId is null, use 'Admin' as the userName
//             FROM 
//                 publicforumreplies r
//             JOIN 
//                 publicforumposts p ON r.chatId = p.id
//             LEFT JOIN  -- Use LEFT JOIN to handle cases where there's no matching user
//                 users u ON r.replyId = u.id
//             WHERE 
//                 r.chatId = ?
//             ORDER BY 
//                 r.createdAt DESC
//         `;
//     db.plantcare.query(sql, [chatId], (err, results) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(results);
//         console.log(results);
//       }
//     });
//   });
// };

exports.getRepliesByChatId = (chatId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
      r.id,
          r.replyId, 
          r.replyStaffId,
          r.replyMessage, 
          r.createdAt, 
          CASE 
            WHEN r.replyStaffId IS NOT NULL THEN f.firstName
            ELSE u.firstName
          END AS userName
      FROM 
          publicforumreplies r
      JOIN 
          publicforumposts p ON r.chatId = p.id
      LEFT JOIN   
          users u ON r.replyId = u.id
      LEFT JOIN
          farmstaff f ON r.replyStaffId = f.id
      WHERE 
          r.chatId = ?
      ORDER BY 
          r.createdAt DESC
    `;
    db.plantcare.query(sql, [chatId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
        console.log(results);
      }
    });
  });
};



// exports.createReply = (chatId, replyId, replyMessage, userId, role) => {
//   return new Promise((resolve, reject) => {
//     const sql =
//       "INSERT INTO publicforumreplies (chatId, replyId, replyMessage) VALUES (?, ?, ?)";
//     db.plantcare.query(sql, [chatId, replyId, replyMessage], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result.insertId); 
//       }
//     });
//   });
// };
exports.createReply = (chatId, replyId, replyMessage, userId, role) => {
  return new Promise((resolve, reject) => {
    let sql;
    let values;

    // Check role and insert accordingly
    if (role === "Owner") {
      sql = "INSERT INTO publicforumreplies (chatId, replyId, replyMessage) VALUES (?, ?, ?)";
      values = [chatId, replyId, replyMessage];
    } else {
      sql = "INSERT INTO publicforumreplies (chatId, replyId, replyMessage,replyStaffId) VALUES (?, ?, ?, ?)";
      values = [chatId, replyId, replyMessage, userId]; // Assign staffId if role is not Owner
    }

    db.plantcare.query(sql, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId);
      }
    });
  });
};


// exports.createPost = (userId, heading, message, postimage, ownerId) => {
//   return new Promise((resolve, reject) => {
//     const sql =
//       "INSERT INTO publicforumposts (userId, heading, message, postimage) VALUES (?, ?, ?, ?)";
//     db.plantcare.query(sql, [userId, heading, message, postimage], (err, result) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(result.insertId); 
//       }
//     });
//   });
// };
exports.createPost = (userId, heading, message, postimage, ownerId, role) => {
  return new Promise((resolve, reject) => {
    let sql;
    let values;

    if (role === "Owner") {
      sql =
        "INSERT INTO publicforumposts (userId, heading, message, postimage) VALUES (?, ?, ?, ?)"
      values = [userId, heading, message, postimage];
    } else {
      sql =
        "INSERT INTO publicforumposts (userId, heading, message, postimage, staffId) VALUES (?, ?, ?, ?, ?)";
      values = [ownerId, heading, message, postimage, userId];
    }

    db.plantcare.query(sql, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId);
      }
    });
  });
};

exports.deletePost = (postId) => {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM publicforumposts WHERE id = ?";
    db.plantcare.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
}

exports.getPostbyId = (postId) => {
  console.log("postid", postId)
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM publicforumposts WHERE id = ?`;
    db.plantcare.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
        console.log(result)
      }
    });
  });
}

exports.updatePost = (postId, heading, message, postimage) => {
  return new Promise((resolve, reject) => {
    // Update the post by its postId
    const sql = `
      UPDATE publicforumposts 
      SET heading = ?, message = ?, postimage = ?
      WHERE id = ?
    `;

    // If postimage is null (no new image), pass NULL in the query
    db.plantcare.query(sql, [heading, message, postimage || null, postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result); // Return result of the update operation
      }
    });
  });
};




// Update the reply message
exports.editReply = (replyId, newMessage) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE publicforumreplies 
      SET replyMessage = ?, createdAt = NOW() 
      WHERE id = ?
    `;

    db.plantcare.query(sql, [newMessage, replyId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        if (result.affectedRows === 0) {
          resolve(null); // No rows updated
        } else {
          // Return the updated reply
          const getSql = `SELECT * FROM publicforumreplies WHERE id = ?`;
          db.plantcare.query(getSql, [replyId], (err, updatedReply) => {
            if (err) reject(err);
            resolve(updatedReply[0]);
          });
        }
      }
    });
  });
};




// Delete the reply
exports.deleteReply = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM publicforumreplies WHERE id = ?";
    db.plantcare.query(sql, [id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.affectedRows > 0);
      }
    });
  });
};