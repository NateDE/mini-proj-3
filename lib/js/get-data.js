//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

var dataRay = [];

function calculateBmi(obs) {
  var sweight = obs.weight;
  var sheight = obs.height;
  sweight = sweight.substring(0, sweight.length - 4);
  sheight = sheight.substring(0, sheight.length - 4);

  var weight = parseInt(sweight)
  var height = parseInt(sheight)

  try {
    var finalBmi = weight/(height/100*height/100)
    bmi.innerHTML = Math.round(finalBmi)
    //document.bmiForm.bmi.value = finalBmi
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
  } catch (error) {
    console.log(error)
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

/*window.addEventListener('load', 
  function() { 
    alert('hello!');
  }, false);*/

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

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
  calculateBmi(obs)
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  function dataWait() {
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
        var val = parseInt(p.sys)
        val = Math.round(val)
        dataRay.push(val)
      } else {
        p.sys = 'undefined'
        dataRay.push(0)
      }

      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
        var val = parseInt(p.dia)
        val = Math.round(val)
        dataRay.push(val)
      } else {
        p.dia = 'undefined'
        dataRay.push(0)
      }

      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);

      if (p.hdl != 'undefined') {
        var val = parseInt(p.hdl)
        val = Math.round(val)
        console.log(val)
        dataRay.push(val)
      } else {
        p.hdl = 'undefined'
        dataRay.push(0)
      }

      if (p.ldl != 'undefined') {
        var val = parseInt(p.ldl)
        val = Math.round(val)
        console.log(val)
        dataRay.push(val)
      } else {
        p.ldl = 'undefined'
        dataRay.push(0)
      }

      displayObservation(p)
    });


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
      var len = parseInt(meds.length)
      dataRay.push(len)
      /*meds.forEach(function(med) {
        //console.log(med.resource.medicationCodeableConcept.text);
        //displayMedication(med.resource.medicationCodeableConcept.text);
      })*/
    },
    function(error) {
      dataRay.push(0)
      console.log(error.stack)
        //document.getElementById("meds").innerText = error.stack;
    }
  );

  dataRay.forEach(function(index) {
    if (Number.isNaN(index)){
      index = 0;
    } 
  })
  }

  console.log(dataRay)

  window.addEventListener('load', async function () {
    await dataWait()
    var ctx = document.getElementById('myChart').getContext('2d');
    console.log(dataRay)
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['SBP', 'DBP', 'LDL', 'HDL', '# of Meds'],
            datasets: [{
                label: 'Patient Data',
                data: dataRay,
                //data: [12, 19, 3, 5, 2],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'                    ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'                    ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
  });


}).catch(console.error);
