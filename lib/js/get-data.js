//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

function calculateBmi(obs) {
  var sweight = obs.weight;
  var sheight = obs.height;
  sweight = sweight.substring(0, sweight.length - 4);
  sheight = sheight.substring(0, sheight.length - 4);

  var weight = parseInt(sweight)
  var height = parseInt(sheight)

  try {
    if(weight > 0 && height > 0){	
      var finalBmi = weight/(height/100*height/100)
      bmi.innerHTML = finalBmi;
      //document.bmiForm.bmi.value = finalBmi
      console.log(weight)
      console.log(height)
      console.log(finalBmi)
      if(finalBmi < 18.5){
        //document.bmiForm.meaning.value = "That you are too thin."
        meaning.innerHTML = "That you are too thin.";
      }
      if(finalBmi > 18.5 && finalBmi < 25){
        //document.bmiForm.meaning.value = "That you are healthy."
        meaning.innerHTML = "That you are healthy."
      }
      if(finalBmi > 25){
        //document.bmiForm.meaning.value = "That you have overweight."
        meaning.innerHTML = "That you are overweight."
      }
    }
  } catch (error) {
    console(error)
  }
}

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
/*function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}*/

//helper function to get quanity and unit from an observation resoruce.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

// create a patient object to initalize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: ''
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

//function to display the observation values you will need to update this
function displayObservation(obs) {
  height.innerHTML = obs.height;
  weight.innerHTML = obs.weight;
  /*hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;*/
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
      //console.log(client);
    }
  );

  // get observation resoruce values
  // you will need to update the below to retrive the weight and height values
  var query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|2085-9',
    'http://loinc.org|2089-1',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|29463-7', // weight
    'http://loinc.org|3141-9' , // weight
    'http://loinc.org|8302-2' , // Body height
    'http://loinc.org|8306-3' , // Body height --lying
  ].join(","));

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {

      // group all of the observation resoruces by type into their own
      var byCodes = client.byCodes(ob, 'code');
      var height = byCodes('8302-2');
      var weight = byCodes('29463-7');

      var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');

      // create patient object
      var p = defaultPatient();

      if(typeof height[0] != 'undefined' && typeof height[0].valueQuantity.value != 'undefined' && typeof height[0].valueQuantity.unit != 'undefined') {
        p.height = height[0].valueQuantity.value + ' ' + height[0].valueQuantity.unit;
        //console.log(p.height);
      }
      if(typeof weight[0] != 'undefined' && typeof weight[0].valueQuantity.value != 'undefined' && typeof weight[0].valueQuantity.unit != 'undefined') {
        p.weight = weight[0].valueQuantity.value + ' ' + weight[0].valueQuantity.unit;
        //console.log(p.weight);
      }

      // set patient value parameters to the data pulled from the observation resoruce
      if (typeof systolicbp != 'undefined') {
        p.sys = systolicbp;
      } else {
        p.sys = 'undefined'
      }

      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
      } else {
        p.dia = 'undefined'
      }

      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);

      displayObservation(p)
      calculateBmi(p)

    });/*


  // dummy data for medrequests
  //var medResults = ["SAMPLE Lasix 40mg","SAMPLE Naproxen sodium 220 MG Oral Tablet","SAMPLE Amoxicillin 250 MG"]

  // Get MedicationRequests for the selected patient
  client.request("/MedicationRequest?patient=" + client.patient.id, {
    resolveReferences: "medicationReference"
  }).then(function(data) {
    if (!data.entry || !data.entry.length) {
        throw new Error("No medications found for the selected patient");
    }

    return data.entry;
  }).then(
    function(meds) {
      meds.forEach(function(med) {
        //console.log(med.resource.medicationCodeableConcept.text);
        displayMedication(med.resource.medicationCodeableConcept.text);
      })
    },
    function(error) {
      console.log(error.stack)
        //document.getElementById("meds").innerText = error.stack;
    }
  );*/


  // get medication request resources this will need to be updated
  // the goal is to pull all the medication requests and display it in the app. It can be both active and stopped medications
  /*medResults.forEach(function(med) {
    displayMedication(med);
  })*//*



  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {
      console.log(ob)

      var p = defaultPatient();

      ob.forEach(function(obj) {
        //console.log(med.resource.medicationCodeableConcept.text);
        if (obj.code.text == "Body Weight"){
          if (!obj.note || !obj.note.length) {
            throw new Error("No more notes found for the selected patient");
          }
          console.log(obj.note)
          displayAnnotation(obj.note[0].text);
          return obj.note[0].text;
        }
      })

      console.log(ob)
      throw new Error("No body weight for the selected patient");

    }).then(
      function(data) {
        console.log(data)
        //displayAnnotation(data);
      },
      function(error) {
        console.log(error.stack)
          //document.getElementById("meds").innerText = error.stack;
      }
    );*/


}).catch(console.error);