const http = require('http')
const yargs = require('yargs')
const fs = require('fs');

const argv = yargs
  .option('m', {
    alias: 'mocks',
    describe: 'the location of the mappings and/or __files'
  })
  .option('h', {
    alias: 'host',
    describe: 'the hostname of the wiremock instance'
  })
  .default('h', 'localhost')
  .option('p', {
    alias: 'port',
    describe: 'the port of the wiremock instance'
  })
  .default('p', 8080)
  .argv;


const addMappingRequest = {
  hostname: argv.host,
  port: argv.port,
  path: '/__admin/mappings',
  method: 'POST'
}

const addMapping = (mappingData) => {
  const request = http.request(addMappingRequest, response => {
    response.on('data', d => {
      process.stdout.write(d)
    })
  });

  const postBody = JSON.stringify(mappingData);
  request.write(postBody);
  request.end();
};

const inlineBodyFile = (stub) => {
  const { response, ...unstub} = stub;
  const { bodyFileName, ...deconstructedResponse } = response;

  fs.readFile(`${argv.mocks}/__files/${bodyFileName}`, (err, bodyData) => {
    const bodyBuffer = Buffer.from(bodyData)
    const newResponse = {
      ...deconstructedResponse,
      ...{ base64Body: bodyBuffer.toString('base64') }
    };
    const restub = { ...unstub, ...{ response: newResponse } };

    addMapping(restub);
  });
}

const load = (path) => {
  fs.readdir(path, (err, files) => {
    if (err) throw err;

    files.forEach(mappingFile => {
      
      if (fs.lstatSync(`${path}/${mappingFile}`).isDirectory()) {
        load(`${path}/${mappingFile}`);
        return;
      }

      fs.readFile(`${path}/${mappingFile}`, (err, data) => {
        if (err) throw err;

        let stub = JSON.parse(data);

        if (stub.response.bodyFileName) {
          inlineBodyFile(stub)
        } else {
          addMapping(stub);
        }
      });
    })
  })
}

load(`${argv.mocks}/mappings`);

const listMappingsRequest = {
  hostname: argv.host,
  port: argv.port,
  path: '/__admin/mappings',
  method: 'GET'
}

const getMappings = () => {
  const req = http.request(listMappingsRequest, res => {
    res.on('data', d => {
      process.stdout.write(d)
    })
  })

  req.end();
};

setTimeout(() => getMappings(), 300);

