"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var uuid_1 = require("uuid");
var prisma = new client_1.PrismaClient();
// Helper to generate random dates after April 1, 2026
var getRandomDateAfterApril2026 = function () {
    var start = new Date(2026, 3, 1).getTime(); // April 1, 2026
    var end = new Date(2027, 11, 31).getTime(); // Dec 31, 2027
    return new Date(start + Math.random() * (end - start));
};
var getRandomItem = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tenantId, tenant, hashedPassword, firstNames, lastNames, rolesDistribution, usersToCreate, allUsers, designers, devs, qas, clientNames, priorities, projectTypes, stages, projectsData, projectResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Starting massive database seed...');
                    tenantId = '3b5339c6-12bc-4d96-a3ec-0d7b0b83d275';
                    return [4 /*yield*/, prisma.tenant.upsert({
                            where: { id: tenantId },
                            update: {},
                            create: {
                                id: tenantId,
                                name: 'Nice Digitals',
                                createdAt: new Date()
                            }
                        })];
                case 1:
                    tenant = _a.sent();
                    console.log("\u2705 Tenant created/verified: ".concat(tenant.name));
                    return [4 /*yield*/, bcryptjs_1.default.hash('password123', 10)];
                case 2:
                    hashedPassword = _a.sent();
                    firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Daniela', 'George', 'Melissa', 'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda', 'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen', 'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Alexander', 'Debra', 'Patrick', 'Rachel', 'Frank', 'Carolyn', 'Raymond', 'Janet', 'Jack', 'Catherine', 'Dennis', 'Maria', 'Jerry', 'Heather'];
                    lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennet', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];
                    rolesDistribution = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], Array(5).fill('ADMIN'), true), Array(35).fill('DESIGNER'), true), Array(35).fill('DEV_MANAGER'), true), Array(25).fill('QA_ENGINEER'), true);
                    usersToCreate = rolesDistribution.map(function (role, index) {
                        var i = index + 1;
                        var firstName = getRandomItem(firstNames);
                        var lastName = getRandomItem(lastNames);
                        var fullName = "".concat(firstName, " ").concat(lastName);
                        // Create an email safe version of the first name, avoiding special chars, standardising exactly.
                        var emailSafeName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return {
                            id: (0, uuid_1.v4)(),
                            name: fullName,
                            email: "".concat(emailSafeName).concat(i, "@nicedigitals.com"),
                            password: hashedPassword,
                            role: role,
                            tenantId: tenant.id,
                            avatar: "/avatars/".concat(role.toLowerCase(), ".jpg"),
                        };
                    });
                    console.log('⏳ Inserting 100 users...');
                    return [4 /*yield*/, prisma.user.createMany({
                            data: usersToCreate,
                            skipDuplicates: true, // In case we run it multiple times
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.findMany({ where: { tenantId: tenantId } })];
                case 4:
                    allUsers = _a.sent();
                    designers = allUsers.filter(function (u) { return u.role === 'DESIGNER'; });
                    devs = allUsers.filter(function (u) { return u.role === 'DEV_MANAGER'; });
                    qas = allUsers.filter(function (u) { return u.role === 'QA_ENGINEER'; });
                    console.log("\u2705 ".concat(allUsers.length, " users ready."));
                    clientNames = [
                        'Acme Corp', 'Stark Industries', 'Wayne Enterprises', 'Umbrella Corp',
                        'Cyberdyne Systems', 'Hooli', 'Pied Piper', 'Initech', 'Globex',
                        'Soylent Corp', 'Massive Dynamic', 'Oscorp', 'Aperture Science',
                        'Black Mesa', 'Virtucon', 'Dunder Mifflin', 'Buy n Large'
                    ];
                    console.log("\u2705 17 distinct clients defined.");
                    priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
                    projectTypes = ['Website Redesign', 'Mobile App', 'Backend Refactor', 'Marketing Site', 'E-commerce Platform', 'CRM Integration', 'Analytics Dashboard'];
                    stages = ['UPCOMING', 'DESIGN', 'DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'];
                    console.log('⏳ Preparing 150 projects...');
                    projectsData = Array.from({ length: 150 }).map(function (_, i) {
                        var client = getRandomItem(clientNames);
                        var pType = getRandomItem(projectTypes);
                        var priority = getRandomItem(priorities);
                        var stage = getRandomItem(stages);
                        var deadline = getRandomDateAfterApril2026();
                        // Randomly assign users if past UPCOMING stage
                        var designerId = null;
                        var devId = null;
                        var qaId = null;
                        if (stage !== 'UPCOMING') {
                            designerId = getRandomItem(designers).id;
                            if (['DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'].includes(stage)) {
                                devId = getRandomItem(devs).id;
                            }
                            if (['QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'].includes(stage)) {
                                qaId = getRandomItem(qas).id;
                            }
                        }
                        return {
                            id: (0, uuid_1.v4)(),
                            name: "".concat(client, " - ").concat(pType, " ").concat(i + 1),
                            clientName: client,
                            scope: "Standard ".concat(pType, " scope covering requirements gathering, design, implementation, and testing."),
                            priority: priority,
                            stage: stage,
                            overallDeadline: deadline,
                            currentDeadline: deadline,
                            tenantId: tenant.id,
                            assignedDesignerId: designerId,
                            assignedDevManagerId: devId,
                            assignedQAId: qaId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            qaFailCount: Math.floor(Math.random() * 3), // 0 to 2 fails
                            completedAt: stage === 'COMPLETED' ? new Date() : null,
                        };
                    });
                    console.log('⏳ Inserting 150 projects...');
                    return [4 /*yield*/, prisma.project.createMany({
                            data: projectsData,
                            skipDuplicates: true
                        })];
                case 5:
                    projectResult = _a.sent();
                    console.log("\u2705 ".concat(projectResult.count, " projects created successfully!"));
                    console.log('🎉 Massive Seeding completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
