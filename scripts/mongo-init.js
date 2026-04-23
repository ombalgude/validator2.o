db = db.getSiblingDB("authenticity-validator");

const ensureCollection = (name) => {
  const existingCollections = db.getCollectionNames();
  if (!existingCollections.includes(name)) {
    db.createCollection(name);
  }
};

["users", "certificates", "institutions", "verification_logs"].forEach(ensureCollection);

db.users.createIndex({ email: 1 }, { unique: true });
db.certificates.createIndex({ certificateId: 1 }, { unique: true });
db.certificates.createIndex({ verificationStatus: 1 });
db.institutions.createIndex({ code: 1 }, { unique: true });
db.verification_logs.createIndex({ certificateId: 1 });
db.verification_logs.createIndex({ timestamp: -1 });

print("Database initialized successfully");
