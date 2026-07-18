/**
* @class Processador de sincronização labial para Português Brasileiro
* @author Adaptado por Claude
* @based_on Trabalho original de Mika Suominen para inglês
*/

class LipsyncPtBr {

  /**
  * @constructor
  */
  constructor() {

    // Regras de conversão de palavras em português para visemas Oculus
    // Adaptado do algoritmo original em inglês com modificações para português brasileiro
    this.rules = {
      'A': [
        "[A]$=aa", "[AZ]#=aa SS", "[AM]#=aa MM", "[AN]#=aa nn",
        "[AR]#=aa RR", "[AL]#=aa LL", "[A]S=aa SS", "[A]R=aa RR",
        "[A]M=aa MM", "[A]N=aa nn", "[AO]=aa U", "[AI]=aa I",
        "[AU]=aa U", "[Ã]O=aa U", "[Ã]#=aa nn", "[Á]#=aa", "[À]#=aa",
        "[Â]#=aa", "[A]=aa"
      ],

      'B': [
        "[B]=PP"
      ],

      'C': [
        "[CH]=SS", "[C]E=SS", "[C]I=SS", "[C]+=kk", "[Ç]=SS", "[C]=kk"
      ],

      'D': [
        "[D]=DD"
      ],

      'E': [
        "[E]M#=E MM", "[E]N#=E nn", "[E]S#=E SS", "[E]R#=E RR",
        "[EI]=E I", "[E]M=E MM", "[E]N=E nn", "[E]S=E SS",
        "[E]L=E LL", "[E]R=E RR", "[Ê]#=E", "[É]#=E", "[E]=E"
      ],

      'F': [
        "[F]=FF"
      ],

      'G': [
        "[G]E=ZZ", "[G]I=ZZ", "[GU]E=kk", "[GU]I=kk", "[G]=kk"
      ],

      'H': [
        "[H]="
      ],

      'I': [
        "[I]M#=I MM", "[I]N#=I nn", "[I]S#=I SS", "[I]R#=I RR",
        "[I]M=I MM", "[I]N=I nn", "[I]S=I SS", "[I]L=I LL",
        "[I]R=I RR", "[Í]#=I", "[I]=I"
      ],

      'J': [
        "[J]=ZZ"
      ],

      'K': [
        "[K]=kk"
      ],

      'L': [
        "[LH]=LL", "[L]=LL"
      ],

      'M': [
        "[M]=MM"
      ],

      'N': [
        "[NH]=nn", "[N]=nn"
      ],

      'O': [
        "[O]M#=O MM", "[O]N#=O nn", "[O]S#=O SS", "[O]R#=O RR",
        "[OI]=O I", "[OU]=O U", "[O]M=O MM", "[O]N=O nn",
        "[O]S=O SS", "[O]L=O LL", "[O]R=O RR", "[Ô]#=O",
        "[Ó]#=O", "[O]=O"
      ],

      'P': [
        "[P]=PP"
      ],

      'Q': [
        "[QU]E=kk", "[QU]I=kk", "[QU]=kk", "[Q]=kk"
      ],

      'R': [
        "[RR]=RR", "[R]=RR"
      ],

      'S': [
        "[SS]=SS", "[SC]E=SS", "[SC]I=SS", "[SH]=SS", "[S]#=SS", 
        "[S]=SS"
      ],

      'T': [
        "[T]=DD"
      ],

      'U': [
        "[U]M#=U MM", "[U]N#=U nn", "[U]S#=U SS", "[U]R#=U RR",
        "[U]M=U MM", "[U]N=U nn", "[U]S=U SS", "[U]L=U LL",
        "[U]R=U RR", "[Ú]#=U", "[Ü]#=U", "[U]=U"
      ],

      'V': [
        "[V]=FF"
      ],

      'W': [
        "[W]=FF"
      ],

      'X': [
        "[X]=SS"
      ],

      'Y': [
        "[Y]=I"
      ],

      'Z': [
        "[Z]=SS"
      ]
    };

    const ops = {
      '#': '[AEIOUÃÁÀÂÊÉÍÓÔÚÜ]+', // Vogais em português
      '$': '[BCDFGHJKLMNPQRSTVWXYZ]+', // Consoantes em português
      '.': '[BDVGJLMNRWZ]', // Consoantes sonoras
      '%': '(?:AR|ER|IR|OR|UR|AS|ES|IS|OS|US)', // Terminações comuns
      '&': '(?:[SCGZXJ]|CH|NH|LH)', // Grupos de consoantes especiais
      '@': '(?:[TSRDLZNJ]|NH|LH)', // Mais grupos de consoantes
      '^': '[BCDFGHJKLMNPQRSTVWXZ]', // Uma consoante
      '+': '[EIÊÉÍÓÔÚÜ]', // Vogais frontais/altas
      ':': '[BCDFGHJKLMNPQRSTVWXZ]*', // Zero ou mais consoantes
      ' ': '\\b' // Início/fim da palavra
    };

    // Converte regras para expressões regulares
    Object.keys(this.rules).forEach( key => {
      this.rules[key] = this.rules[key].map( rule => {
        const posL = rule.indexOf('[');
        const posR = rule.indexOf(']');
        const posE = rule.indexOf('=');
        const strLeft = rule.substring(0,posL);
        const strLetters = rule.substring(posL+1,posR);
        const strRight = rule.substring(posR+1,posE);
        const strVisemes = rule.substring(posE+1);

        const o = { regex: '', move: 0, visemes: [] };

        let exp = '';
        exp += [...strLeft].map( x => ops[x] || x ).join('');
        const ctxLetters = [...strLetters];
        ctxLetters[0] = ctxLetters[0].toLowerCase();
        exp += ctxLetters.join('');
        o.move = ctxLetters.length;
        exp += [...strRight].map( x => ops[x] || x ).join('');
        o.regex = new RegExp(exp);

        if ( strVisemes.length ) {
          strVisemes.split(' ').forEach( viseme => {
            o.visemes.push(viseme);
          });
        }

        return o;
      });
    });

    // Duração dos visemas em unidade relativa (1=média)
    // Ajustado para português brasileiro
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.10,
      'SS': 1.25, 'TH': 1, 'DD': 1.05, 'FF': 1.00, 'kk': 1.15, 'nn': 0.90,
      'RR': 0.95, 'MM': 0.95, 'LL': 0.92, 'ZZ': 1.15, 'sil': 1
    };

    // Pausas em unidades relativas (1=média)
    this.specialDurations = { ' ': 1, ',': 3, '.': 4, ';': 3, ':': 2.5, '?': 3, '!': 3, '-': 0.5, '"': 0.5 };

    // Palavras para números em português
    this.digits = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    this.ones = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
    this.tens = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
    this.teens = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
    this.hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    // Símbolos para português
    this.symbols = {
      '%': 'por cento', '€': 'euros', '&': 'e', '+': 'mais',
      '$': 'reais', '@': 'arroba', '#': 'hashtag', '=': 'igual a',
      '°': 'graus', '/': 'barra'
    };
    this.symbolsReg = /[%€&\+\$@#=°\/]/g;
  }

  convert_digit_by_digit(num) {
    num = String(num).split("");
    let numWords = "";
    for(let m=0; m<num.length; m++) {
      numWords += this.digits[num[m]] + " ";
    }
    numWords = numWords.substring(0, numWords.length - 1); // remove espaço final
    return numWords;
  }

  convert_sets_of_two(num) {
    let firstNumHalf = String(num).substring(0, 2);
    let secondNumHalf = String(num).substring(2, 4);
    let numWords = this.convert_tens(firstNumHalf);
    numWords += " " + this.convert_tens(secondNumHalf);
    return numWords;
  }

  convert_millions(num){
    if (num>=1000000){
      let millions = Math.floor(num/1000000);
      let remainder = num%1000000;
      
      if (millions === 1) {
        return "um milhão " + (remainder > 0 ? "e " + this.convert_thousands(remainder) : "");
      } else {
        return this.convert_hundreds(millions) + " milhões " + (remainder > 0 ? "e " + this.convert_thousands(remainder) : "");
      }
    } else {
      return this.convert_thousands(num);
    }
  }

  convert_thousands(num){
    if (num>=1000){
      let thousands = Math.floor(num/1000);
      let remainder = num%1000;
      
      if (thousands === 1) {
        return "mil " + (remainder > 0 ? "e " + this.convert_hundreds(remainder) : "");
      } else {
        return this.convert_hundreds(thousands) + " mil " + (remainder > 0 ? "e " + this.convert_hundreds(remainder) : "");
      }
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_hundreds(num){
    if (num > 99){
      let hundreds = Math.floor(num/100);
      let remainder = num%100;
      
      if (num === 100) return "cem";
      
      return this.hundreds[hundreds] + (remainder > 0 ? " e " + this.convert_tens(remainder) : "");
    } else {
      return this.convert_tens(num);
    }
  }

  convert_tens(num){
    if (num < 10){
      return (Number(num) != 0 && num.toString().startsWith("0") ? "zero " : "") + this.ones[Number(num)];
    } else if (num>=10 && num<20) {
      return this.teens[num-10];
    } else {
      let tens = Math.floor(num/10);
      let units = num%10;
      
      if (units === 0) {
        return this.tens[tens];
      } else {
        return this.tens[tens] + " e " + this.ones[units];
      }
    }
  }
 
  convertNumberToWords(num){
    if(num == "0"){
      return "zero";
    } else if(num.startsWith('0')){
      return this.convert_digit_by_digit(num);
    } else if (num.length === 8 && (num.startsWith('9') || num.startsWith('8'))) {
      // Para números de telefone no Brasil
      let firstPart = num.substring(0, 4);
      let secondPart = num.substring(4, 8);
      return this.convert_digit_by_digit(firstPart) + " " + this.convert_digit_by_digit(secondPart);
    } else if (num.length === 5) {
      // CEP - código postal brasileiro
      return this.convert_digit_by_digit(num);
    } else if (num.length === 4 && (num >= 1000 && num <= 2099)) {
      // Anos
      if (num >= 2000) {
        return "dois mil e " + this.convert_tens(num % 100);
      } else if (num === 1000) {
        return "mil";
      } else {
        return "mil " + (num % 100 === 0 ? "" : "e " + this.convert_tens(num % 100));
      }
    } else {
      return this.convert_millions(num);
    }
  }

  /**
  * Pré-processamento de texto:
  * - converte símbolos para palavras
  * - converte números para palavras
  * - filtra caracteres que não devem ser pronunciados
  * @param {string} s Texto
  * @return {string} Texto pré-processado.
  */
  preProcessText(s) {
    return s.replace(/[#_*\":;]/g,'')
      .replace( this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\.(\d)/g, '$1 vírgula $2') // Separador decimal em português
      .replace(/(\d),(\d)/g, '$1 vírgula $2') // Separador decimal em português
      .replace(/\d+/g, this.convertNumberToWords.bind(this)) // Números para palavras
      .replace(/(\D)\1\1+/g, "$1$1") // máximo de 2 caracteres repetidos
      .replaceAll('  ',' ') // Apenas um espaço repetido
      .trim();
  }

  /**
  * Converte palavra para Visemas Oculus LipSync e durações
  * @param {string} w Texto
  * @return {Object} Visemas Oculus LipSync e durações.
  */
  wordsToVisemes(w) {
    let o = { words: w.toUpperCase(), visemes: [], times: [], durations: [], i:0 };
    let t = 0;

    const chars = [...o.words];
    while( o.i < chars.length ) {
      const c = chars[o.i];
      const ruleset = this.rules[c];
      if ( ruleset ) {
        for(let i=0; i<ruleset.length; i++) {
          const rule = ruleset[i];
          const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i+1);
          let matches = test.match(rule.regex);
          if ( matches ) {
            rule.visemes.forEach( viseme => {
              if ( o.visemes.length && o.visemes[ o.visemes.length - 1 ] === viseme ) {
                const d = 0.7 * (this.visemeDurations[viseme] || 1);
                o.durations[ o.durations.length - 1 ] += d;
                t += d;
              } else {
                const d = this.visemeDurations[viseme] || 1;
                o.visemes.push( viseme );
                o.times.push(t);
                o.durations.push( d );
                t += d;
              }
            })
            o.i += rule.move;
            break;
          }
        }
      } else {
        o.i++;
        t += this.specialDurations[c] || 0;
      }
    }

    return o;
  }
}

export { LipsyncPtBr };

