require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');
const Application = require('./models/Application');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Admin.deleteMany({});
    await Application.deleteMany({});

    // Seed Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    const admin = new Admin({
      email: [EMAIL_ADDRESS]',
      password: hashedPassword
    });
    await admin.save();
    console.log('Admin seeded (admin@ibes.com / password123)');

    // Seed Applications with full Academic + Personal details
    const applications = [
      {
        fullName: 'Yael Kent',
        certificateName: 'Xerxes Santiago',
        dob: new Date('1998-05-15'),
        gender: 'Female',
        email: 'bokiqoxip@mailinator.com',
        phone: '+1 (716) 497-1252',
        passportNumber: '445',
        country: 'Provident necessita',
        address: 'Et eu nostrud commod',
        department: 'Level 5 Higher Diploma',
        programme: 'Executive Diploma in Marketing',
        intake: 'January 2026 - July 2026',
        creditHours: '120',
        price: '3000 EUR',
        registrationViaCentre: 'Yes',
        centreEmail: 'centre1@unibo-approved.it',
        centrePhone: '+39 051 209 1111',
        highestQualification: 'Bachelor of Science in CS',
        profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        passportCopy: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
        resume: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600',
        transcript1: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
        transcript2: '',
        transcript3: '',
        status: 'Pending'
      },
      {
        fullName: 'Mario Rossi',
        certificateName: 'Mario Rossi Certificate',
        dob: new Date('1996-12-01'),
        gender: 'Male',
        email: 'mario.rossi@studio.unibo.it',
        phone: '+39 333 1234567',
        passportNumber: 'MR7654321',
        country: 'Italy',
        address: 'Via dell\'Indipendenza, 12, Bologna',
        department: 'Level 7 Post Graduate Diploma',
        programme: 'Executive Diploma in Marketing Management',
        intake: 'February 2026 - August 2026',
        creditHours: '180',
        price: '2200 EUR',
        registrationViaCentre: 'No',
        centreEmail: '',
        centrePhone: '',
        highestQualification: 'High School Diploma',
        profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        passportCopy: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
        resume: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600',
        transcript1: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
        transcript2: '',
        transcript3: '',
        status: 'Reviewed'
      }
    ];

    await Application.insertMany(applications);
    console.log('Sample applications seeded successfully');

    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
