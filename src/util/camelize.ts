export default function camelize(label: string) {

  if (label.length === 0)
    return label;

  let n, result, word, words = label.split(/[_-]/);

  // single word with first character already lowercase, return untouched
  if ((words.length === 1) && (words[0][0].toLowerCase() === words[0][0]))
    return label;

  result = words[0].toLowerCase();
  for(n = 1 ; n < words.length ; n++) {
    result = result + words[n].charAt(0).toUpperCase() + words[n].substring(1).toLowerCase();
  }

  return result;
}

camelize.prepended = function(prepend: string, label: string) {
  label = camelize(label);
  return prepend + label[0].toUpperCase() + label.substring(1);
}
