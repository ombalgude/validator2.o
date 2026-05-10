db = db.getSiblingDB("authenticity-validator");

const ensureCollection = (name) => {
  const existingCollections = db.getCollectionNames();
  if (!existingCollections.includes(name)) {
    db.createCollection(name);
  }
};

[
  "users",
  "certificates",
  "companyadmins",
  "institutionadmins",
  "institutions",
  "universityadminrequests",
  "universityadmins",
  "verificationlogs",
].forEach(ensureCollection);

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, isActive: 1 });
db.certificates.createIndex({ certificateId: 1 }, { unique: true });
db.certificates.createIndex({ verificationStatus: 1 });
db.certificates.createIndex({ institutionId: 1, certificateId: 1 });
db.companyadmins.createIndex({ userId: 1 }, { unique: true });
db.companyadmins.createIndex({ companyCode: 1 }, { unique: true, sparse: true });
db.institutionadmins.createIndex({ userId: 1 }, { unique: true });
db.institutionadmins.createIndex({ adminCode: 1 }, { unique: true, sparse: true });
db.institutionadmins.createIndex({ institutionId: 1, isActive: 1 });
db.institutions.createIndex({ code: 1 }, { unique: true });
db.universityadminrequests.createIndex({ status: 1, createdAt: -1 });
db.universityadmins.createIndex({ userId: 1 }, { unique: true });
db.universityadmins.createIndex({ adminCode: 1 }, { unique: true, sparse: true });
db.universityadmins.createIndex({ institutionId: 1, isActive: 1 });
db.verificationlogs.createIndex({ certificateId: 1 });
db.verificationlogs.createIndex({ verifiedBy: 1, timestamp: -1 });
db.verificationlogs.createIndex({ institutionId: 1, timestamp: -1 });
db.verificationlogs.createIndex({ timestamp: -1 });

print("Database initialized successfully");
