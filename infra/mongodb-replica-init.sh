#!/bin/bash
# MongoDB Replica Set Initialization Script
# This script initializes a PSS (Primary-Secondary-Secondary) replica set

set -e

echo "Waiting for MongoDB nodes to be ready..."
sleep 15

echo "Initializing MongoDB replica set..."

mongosh --host mongodb-primary:27017 <<EOF
try {
  var status = rs.status();
  print("Replica set already initialized");
  printjson(status);
} catch (err) {
  print("Initializing replica set...");
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb-primary:27017", priority: 2 },
      { _id: 1, host: "mongodb-secondary1:27017", priority: 1 },
      { _id: 2, host: "mongodb-secondary2:27017", priority: 1 }
    ]
  });
  
  print("Waiting for replica set to be ready...");
  var status = rs.status();
  while (status.members[0].stateStr !== "PRIMARY") {
    sleep(1000);
    status = rs.status();
  }
  
  print("Replica set initialized successfully!");
  printjson(status);
}
EOF

echo "Replica set initialization complete!"

