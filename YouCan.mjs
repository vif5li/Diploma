import * as fs from 'fs';
import WebSocket from 'ws';
import fetch from 'node-fetch';
import metax from './metax_lib.mjs';

async function clear( array )
{
	while ( array.length > 0 )
	{
		array.pop();
	}
}

async function manageMemory( array, nodes, prev = 0 )
{
	for ( let i = 0; i < array.length; i++ )
	{
		await manageVertical( array[i], nodes, prev );
		await manageConnections( array[i], nodes, prev, i );
	}	
}

async function manageConnections( element, nodes, prev = 0, i )
{	
	// recursive call if there is a connected node
	let conn_array = element.connected_node;
	if ( conn_array != null )
	{
		let node = await metax.get( nodes[i] );
		node = JSON.parse( node );

		let conn_nodes = node.connected_nodes;
		if ( conn_nodes == null )
		{
			node.connected_nodes = [];
			let res = await metax.update( nodes[i], JSON.stringify(node), "application/json");
		}
		// change the place of collection
		nodes = node.connected_nodes;
		
		let res = await metax.update( node.uuid, JSON.stringify(node), "application/json");
		await manageMemory( conn_array, nodes, node );
	}
}

async function IsPort( str )
{
	let check = str.indexOf(":");
	if ( check == -1 )
		return true;
	else
		return false;
}

async function reverseType( instName )
{
	if ( instName == null )
		return; 

	const lowerInput = instName.toLowerCase();
		
	if ( lowerInput.indexOf("mmaster") != -1 )
		return "mslave";
	else if ( lowerInput.indexOf("master") != -1 ||
			  lowerInput.indexOf("initiator") != -1 )
		return "mmaster";
	else if ( lowerInput.indexOf("mslave") != -1 )
		return "slave";
	else if ( lowerInput.indexOf("slave") != -1 )
		return "master";
}

async function getConnPinsNum( nodes, i )
{
	let node = await metax.get( nodes[i] );
	node = JSON.parse( node );
	let conn_nodes = node.connected_nodes;
	if (conn_nodes == null)
		return;

	let num = conn_nodes.length;
	return num;
}

async function splitPinName( instName )
{
	let parts = instName.split(":");
	let pinName = parts[1];
	if ( pinName != null )
	{
		let dup = pinName.indexOf("_dup");
		if ( dup != -1 )
		{
			pinName = pinName.substring( 0, dup );
		}
	}
	return pinName;
}

async function splitInstName( instName )
{
	let parts = instName.split(":");
	let compName = parts[0];
	return compName;
}

async function manageConnect( element, nodes, string = "", prev = 0, i )
{	
	// recursive call if there is a connected node
	let conn_array = element.connected_node;
	if ( conn_array != null )
	{
		let node = await metax.get( nodes[i] );
		node = JSON.parse( node );

		let conn_nodes = node.connected_nodes;
		if ( conn_nodes == null )
			return;

		// change the place of collection
		nodes = node.connected_nodes;
		string = await manageVerilog({ array: conn_array, nodes: nodes, string: string, prev: node });
	}
	return string;
}

async function writeInVerilog( uuid, verilogText )
{
	let verilogProperty = await metax.get( uuid ); // get verilog property
	verilogProperty = JSON.parse( verilogProperty );
	let uVerilogText = await metax.save( verilogText, "plain/text");
	verilogProperty.body = uVerilogText;
	await metax.update(  uuid, JSON.stringify( verilogProperty ), "application/json" );
}

async function manageVertical( element, nodes, prev = 0 )
{
	if ( element == null || element.name == null ) //uuid - no - because there is no uuid in json FILE
	{
		return;
	}
		
	// make a node structure for collection
	let sNodeType = "f6d80536-e660-435d-9b08-affd13bc1c35-89282807-efb7-4f5a-9224-0f73e1a293c5";
	element.type = sNodeType;
	let nodeUUID = await metax.save( JSON.stringify( element ), "application/json" );
	element.uuid = nodeUUID;
	
	let instName = element.name;
	let index = instName.indexOf(":");
	let pinName = instName.substring( index + 1 );

	await metax.update( nodeUUID, JSON.stringify( element ), "application/json" );
	
	nodes.push( nodeUUID );

	if ( prev.uuid != null )
	{
		let resUpdate = await metax.update( prev.uuid, JSON.stringify(prev), "application/json");
	}
}
/*
async function createExternalText()
{
	let randomUUID = await metax.save( "just", "plain/text")
	let exTextJson = {
		"uuid": "",
		"type": "3e76b8ff-9063-4052-b67a-ecd43302d269",
		"mime": "",
		"body": "",
		"id": "",
		"name": "New External Text"
	};
	exTextJson.uuid = randomUUID; // set uuid for external text

	let exTextUUID = await metax.save( JSON.stringify( exTextJson ), "application/json" );
	return exTextUUID;
}*/

async function checkInterface( compName )
{
	let res = "";
	let index = compName.indexOf("TO");
	let dot = compName.indexOf(":");
	if ( index != -1 )
		res = compName.substring( index, dot );
	else
		res = compName.substring( 0, dot );

	let result = await getIFCType( res );
	return result;
}

async function getIFCType( str )
{
	if ( str.indexOf("APB") != -1 )
		return "APB";
	else if ( str.indexOf("AHB") != -1 )
		return "AHB";
	else if ( str.indexOf("AXI") != -1 )
		return "AXI";
}

async function manageVector({ array, nodes, vector = [], prev = 0})
{
	for ( let i = 0; i < array.length; i++ )
	{
		vector.push(array[i]);
		await manageRecursive( array[i], nodes, vector, prev, i );
	}
	return vector;
}

async function manageRecursive( element, nodes, vector = [], prev = 0, i )
{	
	// recursive call if there is a connected node
	let conn_array = element.connected_node;
	if ( conn_array != null )
	{
		let node = await metax.get( nodes[i] );
		node = JSON.parse( node );

		let conn_nodes = node.connected_nodes;
		if ( conn_nodes == null )
			return;

		// change the place of collection
		nodes = node.connected_nodes;
		await manageVector({ array: conn_array, nodes: nodes, vector: vector, prev: node });
	}
}

async function manageVerilog({ array, nodes, string = "", prev = 0 })
{
	for ( let i = 0; i < array.length; i++ )
	{
		let pinName = await splitPinName( array[i].name );
		let slaveNum = await getConnPinsNum( nodes, i );
		let compName = array[i].component_name;

		if ( prev != 0 && pinName != null )
		{
			let IFC = await checkInterface( array[i].name );
			let type = await reverseType( pinName );
			
			let connPinName = "";
			for ( let i = 0; i < slaveNum; i++ )
			{
				connPinName += "\tinput " + IFC + type + i + ";\n\toutput " + IFC + type + i + ";\n";
			}
			string += "\nmodule " + compName + "(\n\tinput " + pinName+";\n\toutput "+ pinName+";\n"+connPinName+")\nendmodule\n";
		}
		else
		{
			let bPort = await IsPort( array[i].name );
			if ( bPort == false )
			{
				string += "\nmodule " + compName + "(\n\tinput " + pinName+";\n\toutput "+ pinName+")\nendmodule\n";
			}
		}

		string = await manageConnect( array[i], nodes, string, prev, i );
	}
	return string;
}

async function main()
{
	let connect = await metax.connect(
						"realschool.am:542",
						fs.readFileSync( "C:/Users/armen/OneDrive/Документы/Lilit/Դիպլոմային/Codes/lilo/lilo/private_key.pem" ),//"/home/lilit_arzumanyan/private_key.pem" ),
						fs.readFileSync("C:/Users/armen/OneDrive/Документы/Lilit/Դիպլոմային/Codes/lilo/lilo/lilit_arzumanyan_certificate.pem" ),//"/home/lilit_sarzumanyan/lilit_arzumanyan_certificate.pem"),
						"ViolinMaster@2005"
					);

	let mainUUID = "b197d7ef-9b89-4d15-94c3-a944dcf3f249-a09f6c3f-261b-4338-8fb5-1ddf09042969";
	let mainNode = await metax.get( mainUUID );
	mainNode = JSON.parse( mainNode );

	let jsonPath = "C:/Users/armen/OneDrive/Документы/Lilit/Դիպլոմային/Codes/always.json";
	let jsonData = fs.readFileSync( jsonPath );
	jsonData = JSON.parse( jsonData );

	mainNode.title = jsonData.title;
	mainNode.date = jsonData.date;
	mainNode.project_name = jsonData.project_name;
	mainNode.project_location = jsonData.project_location;
	mainNode.sd_name = jsonData.sd_name;

	let array = jsonData.node_map;
	let nodes = mainNode.node_map;
	let terminal = mainNode.verilog;
	let vector = [];
	await clear( nodes );

	await manageMemory( array, nodes );
	
	vector = await manageVector({ array: array, nodes: nodes, vector: vector });
	let main = "module " + mainNode.sd_name + "(\n";

	// for sd, inputs, wires
	for ( let i = 0; i < vector.length; i++ )
	{
		let pinName = await splitPinName( vector[i].name );
		if ( pinName != null )
		{
			let IFC = await checkInterface( vector[i].name );
			let type = await reverseType( pinName );

			if ( IFC == null )
				continue;

			let connPin = IFC + type + i;

			main += "wire\t" + pinName + ";\n";
			let net1 = "wire\t" + "net_" + connPin + ";\n";
			let net2 = "wire\t" + "net_" + connPin + "_net_0" + ";\n";
			main += net1;
			main += net2;
		}
		else
		{
			let bPort = await IsPort( vector[i].name );
			if ( bPort == true )
			{
				let inout = "Inputs";
				main += "\t// " + inout + "\n\t" + vector[i].name + "\n);\n\n";
				main += "//--------------------------------------------------------------------\n// " + inout + "\n//--------------------------------------------------------------------\n";
				inout = inout.toLowerCase();
				main += inout + "\t" + vector[i].name + ";\n";
				main += "//--------------------------------------------------------------------\n// Nets\n//--------------------------------------------------------------------\n";
				main += "wire\t" + vector[i].name + ";\n";
			}
		}
	}

	main += "//--------------------------------------------------------------------\n// Top level output port assignments\n//--------------------------------------------------------------------\n";
	
	// for nets
	for ( let i = 0; i < vector.length; i++ )
	{
		let pinName = await splitPinName( vector[i].name );
		if ( pinName != null )
		{
			let IFC = await checkInterface( vector[i].name );
			let type = await reverseType( pinName );
						
			if ( IFC == null )
				continue;
		
			let connPin = IFC + type + i;

			let net1 = "net_" + connPin + ";";
			let net2 = "net_" + connPin + "_net_0" + ";";
			main += "assign " + net2 + " = " + net1 + "\n";
			main += "assign port" + connPin + " = " + net2 + "\n"; 
		}
	}
	
	main += "//--------------------------------------------------------------------\n// Component instances\n//--------------------------------------------------------------------\n";

	let string = "";
	let res = await manageVerilog({ array: array, nodes: nodes, string: string });
	let output = await combineModuleDefinitions( res );
	let instances = await generateModulesString( output, vector );

	main += instances + "\n";
	main += output;
	
	await writeInVerilog( terminal, main );

	let result = await metax.update( mainUUID, JSON.stringify(mainNode), "application/json");
	console.log("THE END")
}

main();

async function generateModulesString(modulesStr, nodes)
{
    // Split the input string into individual module strings
    const moduleRegex = /module\s+[\s\S]+?endmodule/g;
    const moduleMatches = modulesStr.match(moduleRegex);

    if (!moduleMatches) {
        throw new Error('No valid modules found in the input string');
    }

    let resultString = '';

    moduleMatches.forEach(moduleStr => {
        // Extract the module name
        const moduleNameMatch = moduleStr.match(/module\s+(\w+)/);
        if (!moduleNameMatch) {
            throw new Error('Invalid module string');
        }
        const moduleName = moduleNameMatch[1];

        // Extract the ports
        const portMatches = moduleStr.match(/input\s+(\w+);|output\s+(\w+);/g);
        if (!portMatches) {
            throw new Error('No ports found in the module string');
        }

        // Create a set to store unique ports
        const portsSet = new Set();
        portMatches.forEach(match => {
            const port = match.replace(/input\s+|output\s+|;/g, '').trim();
            portsSet.add(port);
        });

        // Find the corresponding node's name
        const node = nodes.find(node => node.component_name === moduleName);
        if (!node) {
            throw new Error(`No matching node found for the module: ${moduleName}`);
        }

        let nodeName = node.name;
		let index = nodeName.indexOf(":");
		if ( index != -1 )
			nodeName = nodeName.substring( 0, index );

        // Construct the new string for this module
        const portsArray = Array.from(portsSet);
        const portsString = portsArray.map(port => `.${port}`).join(',\n\t');

        resultString += `${moduleName} ${nodeName}(\n\t${portsString}\n);\n`;
    });

    return resultString.trim();
}

// for modules with the same name | mixing bodies into one module
async function combineModuleDefinitions(inputString)
{
    // Define a regex pattern to match module definitions
    const modulePattern = /module\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*endmodule/g;

    let match;
    const modules = {};

    // Process each matched module definition
    while ((match = modulePattern.exec(inputString)) !== null) {
        const moduleName = match[1];
        const moduleBody = match[2].trim().split('\n').map(line => line.trim());

        if (modules[moduleName]) {
            // Add only unique lines to the existing module body
            moduleBody.forEach(line => {
                if (!modules[moduleName].includes(line)) {
                    modules[moduleName].push(line);
                }
            });
        } else {
            modules[moduleName] = moduleBody;
        }
    }

    // Construct the final output string
    let outputString = '';
    for (const [name, bodyLines] of Object.entries(modules)) {
        const uniqueBody = bodyLines.join('\n');
        outputString += `module ${name}(\n${uniqueBody}\n)\nendmodule\n\n`;
    }

    return outputString;
}
