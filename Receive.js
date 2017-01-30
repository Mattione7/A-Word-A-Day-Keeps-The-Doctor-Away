//Ottaviani Mattia 1405202
//Russo Stefano 1481355
//Pone Sara 1659051

var amqp = require('./node_modules/amqplib/callback_api');
var cont_accessi = 0;
var cont_parole = 0;
var cont_errori = 0;

amqp.connect('amqp://localhost', function(err, conn) {
  
//controllo accessi
conn.createChannel(function(err, ch) {
    var q = 'query_accesso';
    ch.assertQueue(q, {durable: false});
    console.log("Pronto per contare gli accessi");
    ch.consume(q, function(msg) {
		cont_accessi++;
      console.log("Un utente ha effettuato l'accesso!\nNumero Accessi: %d", cont_accessi);
		
    }, {noAck: true});
  });

//controllo parole
conn.createChannel(function(err, ch) {
    var q = 'query_parola';
    ch.assertQueue(q, {durable: false});
    console.log("Pronto per registrare e contare le parole");
    ch.consume(q, function(msg) {
		cont_parole++;
      console.log("Un utente ha generato la parola "+msg.content.toString().toUpperCase()+" !\nParole Generate: %d", cont_parole);
		
    }, {noAck: true});
  });

//controllo errori
conn.createChannel(function(err, ch) {
    var q = 'query_errore';
    ch.assertQueue(q, {durable: false});
    console.log("Pronto per registrare e contare gli errori (speriamo che non ce ne sia nessuno)");
    ch.consume(q, function(msg) {
		cont_errori++;
        console.log("Si è verificato l'errore "+msg.content.toString().toUpperCase()+" !\nNumero errori: %d", cont_errori);
		
    }, {noAck: true});
  });

});
