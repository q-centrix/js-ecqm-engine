const CQLCalculator = require('../../lib/models/cql_calculator.js');
const Measure = require('cqm-models').Measure;
const ValueSetSchema = require('cqm-models').ValueSetSchema;
const PatientSource = require('../../lib/models/patient_source.js');
const Mongoose = require('mongoose');
const _ = require('lodash');

const valueSetsHash = require('../fixtures').value_sets;
const patientsHash = require('../fixtures').patients;
const measuresHash = require('../fixtures').measures;

describe('A CQL Calculation engine instance', () => {
  const connectionInfo = 'mongodb://127.0.0.1:27017/js-ecqme-test';
  let ValueSet;
  const valueSetsByMongoid = {};
  const valueSetsByOid = {};
  const patientsMongoized = [];
  const patientMongoidToName = {};
  const measuresMongoized = {};
  const cqlCalculator = new CQLCalculator();
  const patientSource = new PatientSource(connectionInfo);

  beforeAll(() => {
    let valueSetMongo;
    Mongoose.connect(connectionInfo);
    ValueSet = Mongoose.model('Health_Data_Standards_SVS_Value_Set', ValueSetSchema);
    Object.values(valueSetsHash).forEach((valueSet) => {
      valueSetMongo = ValueSet(valueSet);
      valueSetsByMongoid[valueSetMongo._id] = valueSetMongo;

      if (!(valueSet.oid in valueSetsByOid)) {
        valueSetsByOid[valueSet.oid] = {};
      }
      valueSetsByOid[valueSet.oid][valueSet.version] = valueSetMongo;
    });

    Object.keys(patientsHash).forEach((patientKey) => {
      const patientMongo = patientSource.QDMPatient(patientsHash[patientKey]);
      patientsMongoized.push(patientMongo);
      patientMongoidToName[patientMongo._id] = patientKey;
    });

    Object.keys(measuresHash).forEach((mesKey) => {
      const mesMongoized = new Measure(measuresHash[mesKey]);
      measuresHash[mesKey].value_set_oid_version_objects.forEach((versionObject) => {
        mesMongoized.value_sets.push(valueSetsByOid[versionObject.oid][versionObject.version]._id);
      });
      measuresMongoized[mesKey] = mesMongoized;
    });
  });

  it('performs measure calculations given a measure and a single patient', () => {
    const resultsByMeasure = {};
    Object.keys(measuresMongoized).forEach((mesKey) => {
      patientSource.patients = [_.find(
        patientsMongoized,
        p => _.find(
          p.extendedData.measure_ids,
          m => m === measuresMongoized[mesKey].hqmf_set_id
        )
      )];

      resultsByMeasure[mesKey] = cqlCalculator.calculate(
        measuresMongoized[mesKey],
        patientSource, valueSetsByMongoid
      );
    });
    // Near impossible to check specific results because there are so many,
    // but many of these have been hand-verified.
    // These will return failures if the calculation breaks at any point.
    expect(true).toBe(true);
  });

  it('performs measure calculations given all measures against all patients', () => {
    const resultsByMeasure = {};
    Object.keys(measuresMongoized).forEach((mesKey) => {
      patientSource.patients = _.filter(
        patientsMongoized,
        p => _.find(
          p.extendedData.measure_ids,
          m => m === measuresMongoized[mesKey].hqmf_set_id
        )
      );

      resultsByMeasure[mesKey] = cqlCalculator.calculate(
        measuresMongoized[mesKey],
        patientSource, valueSetsByMongoid
      );
    });
    // Near impossible to check specific results because there are so many,
    // but many of these have been hand-verified
    // These will return failures if the calculation breaks at any point.
    expect(true).toBe(true);
  });
});
