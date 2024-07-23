function* gen() {
  yield 1;
  yield Promise.resolve(2);
  yield Promise.reject(3);
}

async function main() {
  for await (const item of gen()) {
    console.log(item);
  }
}

main();
