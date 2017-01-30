//Ottaviani Mattia 1405202
//Russo Stefano 1481355
//Pone Sara 1659051

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var amqp = require('./node_modules/amqplib/callback_api');

http.createServer(function(request, response) {
		
	var codice;
		
	if(request.url.indexOf('?code=')>-1){

		//richiesta e verifica utente facebook(OAuth)
			
		codice = request.url.substring(7, request.url.length);
			
		var options_fb = {
			host: 'graph.facebook.com',
			port: 443,
			path: '/v2.8/oauth/access_token?response_type=code&client_id=197201944087559&redirect_uri=http://localhost:8000'+request.url+'&client_secret=73940f72fa6e6451a8aae1c6b23e8b93&code='+codice,
			method: 'GET'
		};

		var req = https.request(options_fb, function(res) {
  							
 			res.setEncoding('utf8');
  			res.on('data', function (chunk) {
    	
				if(res.statusCode==200&&chunk.indexOf('access_token')>-1){
							
					//Utente Valido

					//Richiesta Parola

					var options_stg = {
						host: 'setgetgo.com',
						port: 80,
  						path: './randomword/get.php',
  						method: 'GET'
					};

					var parola;
					var req = http.request(options_stg, function(res) {
 
						res.on('data', function (chunk) {

							//Richiesta Definizione Parola

							parola = chunk.toString();
							var definizione;
							var options_obd = {
								host: 'owlbot.info',
  									port: 443,
 									path: '/api/v1/dictionary/'+parola,
  									method: 'GET'
							};
						
							//stampa pagina HTML (dinamicamente)	
								
							var req = https.request(options_obd, function(res) {
  							
								res.setEncoding('utf8');
								var body;
								res.on('data', function (content) {
									body += content;
								});
								res.on('end', function() {

									definizione = body.substring(body.indexOf('defenition')+13, body.indexOf('example')-3);
									if(definizione=='[]'||definizione=='undefined[]'){
										definizione = 'this word is unusual, even for this Dictionary ;)\nTry to search it on Google!';
									}
									response.writeHead(200, { 'Content-Type': 'text/html' });
  									response.write('<!DOCTYPE html><html><head></head><body><TABLE align="center"><TR align="center"><TD><A>YOUR WORD IS:</A></TD></TR><TR align="center"><TD><C style="color:blue;"><h1><b>'+parola.toUpperCase()+'</b></h1></C></TD></TR><TR align="center"><TD><C style="color:grey;"><b><small>*word obtained from: setgetgo.com/randomword</small></b></C></TD></TR><TR align="center" border="1"><TD><A>DEFINITION:</A></TD></TR><TR align="center"><TD><textarea rows="4" cols="50">'+definizione+'</textarea></TD></TR><TR align="center"><TD><C style="color:grey;"><b><small>*definition obtained from: owlbot.info/api/v1/dictionary</small></b></C></TD></TR><TR align="center"><TD><a href="https://www.facebook.com/sharer/sharer.php?u=http://anappaday.altervista.org/&quote=A+WORD+A+DAY+KEEPS+THE+DOCTOR+AWAY+generated+the+word+:+'+parola.toUpperCase()+'" target="_blank"><img  alt="login_button" src="http://dev.humanebroward.org/wp-content/uploads/2014/01/Facebook-Share-button.png" width="150" height="50" ></a></TD></TR></TABLE><TABLE align="center"><TR align="center"><TD><D>search the word '+parola.toUpperCase()+' on Google</D></TD><TD><a href="http://www.google.com/search?q='+parola+'" target="_blank"><img  src="http://icons.iconarchive.com/icons/danleech/simple/64/google-icon.png" width="64" height="64" ></a></TD><TR align="center"><TD><D>go to Wikipedia disambiguation page for the word '+parola.toUpperCase()+'</D></TD><TD><a href="https://en.wikipedia.org/wiki/'+parola+'_%28disambiguation%29" target="_blank"><img  src="http://icons.iconarchive.com/icons/stalker018/mmii-flat-vol-3/128/wikipedia-icon.png" width="64" height="64" ></a></TD></TABLE></TR></body></html>');
									response.end();

									//invio parola (Rabbitmq)
									amqp.connect('amqp://localhost', function(err, conn) {
										conn.createChannel(function(err, ch) {
    										var q = 'query_parola';
	   										var msg = parola;
   											ch.assertQueue(q, {durable: false});
  		  									ch.sendToQueue(q, new Buffer(msg));
    									});
  									});
									//fine invio parola
								
								});
							}).end();
						});
					});
					
					req.on('error', function(e) {
  						response.write('problem with request: ' + e.message);
  						response.end();
					});
					req.end();

					} else {
						
						//Utente non Valido 

						fs.readFile("Home.html", function(err, data){
								
							response.writeHead(200, {'Content-Type': 'text/html'});
  							response.write(data);
							response.write('WARNING: the autentication process did not work! Please retry to log in!');
  							response.end();

							//notifica errore (Rabbitmq)
							amqp.connect('amqp://localhost', function(err, conn) {
     							conn.createChannel(function(err, ch) {
									var q = 'query_errore';
 			   						var msg = 'invalid AUTENTICATION CODE';
				 					ch.assertQueue(q, {durable: false});
    								ch.sendToQueue(q, new Buffer(msg));
    							 });
  							});
							//fine notifica errore
								
						});	
					}
  				});
			});
	
			req.write('data\n');
			req.end();
			
			} else {
			
				if(request.url=='/'||request.url=='/favicon.ico'){

					if(request.url=='/favicon.ico'){
						return;
					}
					
					//notifica Collegamento Utente(Rabbitmq)

					amqp.connect('amqp://localhost', function(err, conn) {
						conn.createChannel(function(err, ch) {
    						var q = 'query_accesso';
		    				var msg = '';
	    					ch.assertQueue(q, {durable: false});    
	    					ch.sendToQueue(q, new Buffer(msg));    
  						});
  					});

					//FINE

				fs.readFile("Home.html", function(err, data){
					response.writeHead(200, {'Content-Type': 'text/html'});
  					response.write(data);
  					response.end();
				});
									
			}else{				
				
				//gestione permessi rifiutati dall'Utente

				if(request.url.indexOf('?error=access_denied&error_code=200&error_description=Permissions+error&error_reason=user_denied')>-1){
					
					fs.readFile("Home.html", function(err, data){
						response.writeHead(200, {'Content-Type': 'text/html'});
  						response.write(data);
						response.write('WARNING: you must accept permissions to continue!');
  						response.end();
					});

				}else{
					
					//notifica errore (Rabbitmq)

					amqp.connect('amqp://localhost', function(err, conn) {
	 					conn.createChannel(function(err, ch) {
    						var q = 'query_errore';
	 			   			var msg = 'invalid URL';
		  					ch.assertQueue(q, {durable: false});
    	   					ch.sendToQueue(q, new Buffer(msg));
     					 });
  					});

					//fine notifica errore
				
					response.write('invalid URL');
  					response.end();
				
					}
				}
			}


}).listen(8000);
console.log('Server in ascolto su localhost:8000');

