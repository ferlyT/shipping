const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/ShipmentBatchesPage.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

const mapping = {
  'text-[9px]': 'text-[9px] sm:text-[9.5px] md:text-[10px]',
  'text-[9.5px]': 'text-[9.5px] sm:text-[10px] md:text-[10.5px]',
  'text-[10px]': 'text-[10px] sm:text-[11px] md:text-xs',
  'text-[10.5px]': 'text-[10.5px] sm:text-[11px] md:text-[11.5px]',
  'text-[11px]': 'text-[11px] sm:text-[11.5px] md:text-xs',
  'text-[11.5px]': 'text-[11.5px] sm:text-xs md:text-[12.5px]',
  'text-[12px]': 'text-[12px] sm:text-[12.5px] md:text-[13px]',
  'text-[12.5px]': 'text-[12.5px] sm:text-[13px] md:text-[13.5px]',
  'text-xs': 'text-xs sm:text-[13px] md:text-[14px]',
  'text-[13px]': 'text-[13px] sm:text-[14px] md:text-[15px]',
  'text-[13.5px]': 'text-[13.5px] sm:text-[14px] md:text-[15px]',
  'text-[13.6px]': 'text-[13.6px] sm:text-[14.5px] md:text-[15px]',
  'text-[14px]': 'text-[14px] sm:text-[14.5px] md:text-[15px]',
  'text-sm': 'text-sm sm:text-[14.5px] md:text-[15px]',
  'text-[15px]': 'text-[15px] sm:text-[15.5px] md:text-base',
  'text-[15.2px]': 'text-[15.2px] sm:text-[15.5px] md:text-base',
  'text-[0.65rem]': 'text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem]',
  'text-[0.7rem]': 'text-[0.7rem] sm:text-[0.75rem] md:text-[0.8rem]',
  'text-[0.82rem]': 'text-[0.82rem] sm:text-[0.85rem] md:text-[0.9rem]',
  'text-[0.85rem]': 'text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem]',
  'text-[0.88rem]': 'text-[0.88rem] sm:text-[0.92rem] md:text-[0.96rem]',
  'text-[1.1rem]': 'text-[1.1rem] sm:text-[1.15rem] md:text-[1.2rem]',
  'text-[1.2rem]': 'text-[1.2rem] sm:text-[1.25rem] md:text-[1.3rem]',
  'text-[1.3rem]': 'text-[1.3rem] sm:text-[1.4rem] md:text-[1.5rem]',
  'text-lg': 'text-lg sm:text-[1.15rem] md:text-[1.2rem]',
  'text-2xl': 'text-2xl sm:text-[1.6rem] md:text-[1.7rem]',
  'text-3xl': 'text-3xl sm:text-[2rem] md:text-[2.2rem]'
};

// Replace class strings everywhere intelligently
// Match anything between quotes or backticks that looks like a class string
const classRegex = /className=["'`]((?:[^"'`\\]|\\.)*)["'`]/g;

code = code.replace(classRegex, (match, classListStr) => {
  const quoteChar = match[10]; // character before the matched string, wait no, match[0] is className="...
  const quote = match.charAt(10); // get the quote character (" or ' or `)
  
  // Actually classRegex matches className="..."
  // Let's use a replacer that splits words and replaces
  let words = classListStr.split(/\s+/);
  
  // if the list already contains responsive sizing for a text, skip it to avoid duplication?
  // let's just do a map and then remove duplicates
  let newWords = [];
  let hasResponsiveText = words.some(w => w.startsWith('sm:text-') || w.startsWith('md:text-') || w.startsWith('lg:text-'));
  
  for (let w of words) {
    if (mapping[w] && !hasResponsiveText) { // only apply if no responsive text class already exists in this string
      newWords.push(...mapping[w].split(' '));
    } else {
      newWords.push(w);
    }
  }
  
  const uniqueWords = [...new Set(newWords)];
  return `className=${quote}${uniqueWords.join(' ')}${quote}`;
});

// Since cn() might be used: className={cn("text-[13px]", isTrue ? "text-sm" : "")}
// This is harder to parse safely with Regex.
// So we will also do a raw pass carefully: replace mapping keys ONLY IF they are bounded by quotes or spaces
// BUT we skip if preceded by sm:, md: etc.
for (const [key, value] of Object.entries(mapping)) {
  const regex = new RegExp(`(?<![a-z0-9-]:)(?<=['"\`\\s])${key.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}(?=['"\`\\s])`, 'g');
  
  code = code.replace(regex, (match, offset, fullString) => {
    // Check if the surrounding string already has sm:text- or md:text- nearby
    // We can do a quick check of the 30 chars ahead
    const lookahead = fullString.slice(offset, offset + 40);
    if (lookahead.includes('sm:text-') || lookahead.includes('md:text-')) {
      return match;
    }
    return value;
  });
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Fonts updated!');
