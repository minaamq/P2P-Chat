const OnlineStatus = ({ online }) => {
    return (
      <div className="flex items-center">
        <div
          className={`h-3 w-3 rounded-full ${
            online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="ml-2 text-sm text-gray-500">
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
    )
  }
  
  export default OnlineStatus